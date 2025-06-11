import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SvgXml } from "react-native-svg";

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { PrayerName, PrayerTime } from "@/types/prayer";
import {
  getCurrentPrayerAndNext,
  getTodayString,
  parseTimeString,
} from "@/utils/dateHelpers";
import { generatePDFHTML } from "@/utils/pdfGenerator";
import { Asset } from "expo-asset";

const { width, height } = Dimensions.get("window");

type ViewMode = "daily" | "monthly";

export default function TodayScreen() {
  const colorScheme = useColorScheme();
  const { prayerTimes, refreshData, isLoading } = usePrayerTimes();
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [todaysPrayers, setTodaysPrayers] = useState<PrayerTime | null>(null);
  const [currentPrayer, setCurrentPrayer] = useState<PrayerName | null>(null);
  const [nextPrayer, setNextPrayer] = useState<PrayerName | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [monthData, setMonthData] = useState<PrayerTime[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  const colors = Colors[colorScheme ?? "light"];
  const today = getTodayString();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const [logoSvg, setLogoSvg] = useState<string>("");

  // Load SVG logo
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const asset = Asset.fromModule(
          require("@/assets/logos/mosqueLogo.svg")
        );
        await asset.downloadAsync();
        const response = await fetch(asset.localUri || asset.uri);
        const svgContent = await response.text();
        setLogoSvg(svgContent);
      } catch (error) {
        console.error("Error loading logo:", error);
      }
    };
    loadLogo();
  }, []);

  // Simple scroll handler
  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    setIsHeaderCollapsed(scrollY > 50);
  };

  // Helper function to format time to hh:mm
  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return "N/A";
    if (timeString.length === 5 && timeString.includes(":")) {
      return timeString;
    }
    if (timeString.includes(":")) {
      const parts = timeString.split(":");
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`;
      }
    }
    return timeString;
  };

  // Countdown calculation function
  const getCountdownToNext = (): string => {
    if (!todaysPrayers || !nextPrayer) return "";

    const prayerTimes = {
      fajr: todaysPrayers.fajr_begins,
      sunrise: todaysPrayers.sunrise,
      zuhr: todaysPrayers.zuhr_begins,
      asr: todaysPrayers.asr_mithl_1,
      maghrib: todaysPrayers.maghrib_begins,
      isha: todaysPrayers.isha_begins,
    };

    const nextPrayerTime = prayerTimes[nextPrayer];
    if (!nextPrayerTime) return "";

    const now = new Date();
    const nextTime = parseTimeString(nextPrayerTime);

    if (nextTime < now) {
      nextTime.setDate(nextTime.getDate() + 1);
    }

    const diff = nextTime.getTime() - now.getTime();

    if (diff <= 0) return "Now";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Keep all your existing useEffect hooks exactly the same
  useEffect(() => {
    if (!prayerTimes || prayerTimes.length === 0) {
      setMonthData([]);
      return;
    }

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-01`;
    const monthEnd = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-${String(daysInMonth).padStart(2, "0")}`;

    const filtered = prayerTimes
      .filter((pt) => {
        if (!pt || !pt.d_date) return false;
        const isInRange = pt.d_date >= monthStart && pt.d_date <= monthEnd;
        return isInRange;
      })
      .sort((a, b) => a.d_date.localeCompare(b.d_date));

    setMonthData(filtered);
  }, [prayerTimes, currentMonth, currentYear]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateTodaysPrayers = () => {
      if (!Array.isArray(prayerTimes) || prayerTimes.length === 0) {
        setTodaysPrayers(null);
        return;
      }

      const todayData = prayerTimes.find((pt) => pt && pt.d_date === today);

      if (todayData && typeof todayData === "object") {
        setTodaysPrayers(todayData);

        try {
          const { current, next } = getCurrentPrayerAndNext(todayData);
          setCurrentPrayer(current);
          setNextPrayer(next);
        } catch (error) {
          console.log("Error:", error);
          setCurrentPrayer(null);
          setNextPrayer("fajr");
        }
      } else {
        setTodaysPrayers(null);
      }
    };

    updateTodaysPrayers();
    const interval = setInterval(updateTodaysPrayers, 60000);
    return () => clearInterval(interval);
  }, [prayerTimes, today]);

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatCurrentDate = () => {
    return currentTime.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPrayerIcon = (prayerName: string) => {
    switch (prayerName.toLowerCase()) {
      case "fajr":
        return "🌅";
      case "sunrise":
        return "☀️";
      case "zuhr":
        return "🌞";
      case "asr":
        return "🌤️";
      case "maghrib":
        return "🌅";
      case "isha":
        return "🌙";
      default:
        return "🕐";
    }
  };

  const getMonthName = (monthIndex: number) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[monthIndex];
  };

  const handlePrint = async () => {
    setIsExporting(true);

    try {
      let html = "";
      let filename = "";

      if (viewMode === "daily" && todaysPrayers) {
        html = await generatePDFHTML([todaysPrayers], "day");
        const dayDate = new Date(todaysPrayers.d_date);
        filename = `prayer-times-${dayDate.toISOString().split("T")[0]}.pdf`;
      } else if (viewMode === "monthly" && monthData.length > 0) {
        html = await generatePDFHTML(monthData, "month");
        filename = `prayer-times-${getMonthName(
          currentMonth
        )}-${currentYear}.pdf`;
      } else {
        Alert.alert("Error", "No data available to print");
        setIsExporting(false);
        return;
      }

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (Platform.OS === "ios") {
        await Sharing.shareAsync(uri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
        });
      } else {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share Prayer Times PDF",
        });
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert("Error", "Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Keep all your existing render functions exactly the same
  const renderPrayerCard = (
    name: string,
    time: string,
    jamah?: string,
    isActive = false,
    isNext = false
  ) => {
    const cardStyle = [
      styles.prayerCard,
      isActive && styles.activePrayerCard,
      isNext && styles.nextPrayerCard,
    ];

    const textColor = isActive ? "#fff" : isNext ? colors.primary : "#333";
    const subtextColor = isActive
      ? "rgba(255,255,255,0.8)"
      : isNext
      ? `${colors.primary}80`
      : "#666";

    return (
      <Animated.View
        key={name}
        style={[cardStyle, isActive && { transform: [{ scale: pulseAnim }] }]}
      >
        <View style={styles.prayerCardContent}>
          <View
            style={[
              styles.prayerIconContainer,
              {
                backgroundColor: isActive
                  ? "rgba(255,255,255,0.2)"
                  : isNext
                  ? `${colors.primary}20`
                  : "#f0f0f0",
              },
            ]}
          >
            <Text style={styles.prayerIcon}>{getPrayerIcon(name)}</Text>
          </View>

          <View style={styles.prayerInfo}>
            <Text style={[styles.prayerName, { color: textColor }]}>
              {name}
            </Text>

            <View style={styles.compactTimeSection}>
              <View style={styles.compactTimeRow}>
                <Text
                  style={[styles.compactTimeLabel, { color: subtextColor }]}
                >
                  Begin
                </Text>
                <Text style={[styles.compactPrayerTime, { color: textColor }]}>
                  {formatTime(time)}
                </Text>
              </View>

              {jamah && (
                <View style={styles.compactTimeRow}>
                  <Text
                    style={[styles.compactTimeLabel, { color: subtextColor }]}
                  >
                    Jamah
                  </Text>
                  <Text style={[styles.compactJamahTime, { color: textColor }]}>
                    {formatTime(jamah)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {(isActive || isNext) && (
            <View style={styles.compactStatusContainer}>
              {isActive && (
                <View style={styles.compactStatusBadge}>
                  <Text style={styles.compactStatusText}>NOW</Text>
                </View>
              )}
              {isNext && !isActive && (
                <View
                  style={[styles.compactStatusBadge, styles.compactNextBadge]}
                >
                  <Text
                    style={[
                      styles.compactStatusText,
                      { color: colors.primary },
                    ]}
                  >
                    {getCountdownToNext() || "NEXT"}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  if (!Array.isArray(prayerTimes) || prayerTimes.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View
          style={[
            styles.header,
            isHeaderCollapsed ? styles.headerCollapsed : styles.headerExpanded,
          ]}
        >
          {!isHeaderCollapsed && (
            <>
              <View style={styles.logoContainer}>
                {logoSvg ? (
                  <SvgXml xml={logoSvg} width={60} height={60} />
                ) : (
                  <Text style={styles.logoPlaceholder}>🕌</Text>
                )}
              </View>
              <Text style={styles.mosqueTitle}>Masjid Abubakr Siddique</Text>
            </>
          )}
          <Text
            style={[
              styles.headerTime,
              isHeaderCollapsed && styles.headerTimeCollapsed,
            ]}
          >
            {formatCurrentTime()}
          </Text>
          <Text
            style={[
              styles.headerDate,
              isHeaderCollapsed && styles.headerDateCollapsed,
            ]}
          >
            {isHeaderCollapsed
              ? currentTime.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              : formatCurrentDate()}
          </Text>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingTop: 8 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.noDataCard}>
            <Text style={styles.noDataIcon}>📅</Text>
            <Text style={styles.noDataTitle}>Prayer Times Not Available</Text>
            <Text style={styles.noDataText}>
              Prayer times haven't been uploaded yet. Please contact the mosque
              administration.
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={refreshData}
              disabled={isLoading}
            >
              <Text style={styles.refreshButtonText}>
                {isLoading ? "🔄 Checking..." : "🔄 Refresh"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Simple Collapsible Header */}
      <View
        style={[
          styles.header,
          isHeaderCollapsed ? styles.headerCollapsed : styles.headerExpanded,
        ]}
      >
        {!isHeaderCollapsed && (
          <>
            <View style={styles.logoContainer}>
              {logoSvg ? (
                <SvgXml xml={logoSvg} width={60} height={60} />
              ) : (
                <Text style={styles.logoPlaceholder}>🕌</Text>
              )}
            </View>
            <Text style={styles.mosqueTitle}>Masjid Abubakr Siddique</Text>
          </>
        )}
        <Text
          style={[
            styles.headerTime,
            isHeaderCollapsed && styles.headerTimeCollapsed,
          ]}
        >
          {formatCurrentTime()}
        </Text>
        <Text
          style={[
            styles.headerDate,
            isHeaderCollapsed && styles.headerDateCollapsed,
          ]}
        >
          {isHeaderCollapsed
            ? currentTime.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            : formatCurrentDate()}
        </Text>
      </View>

      {/* Toggle and Print Button */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleWrapper}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === "daily" && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode("daily")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.toggleText,
                viewMode === "daily" && styles.toggleTextActive,
              ]}
            >
              Daily
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === "monthly" && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode("monthly")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.toggleText,
                viewMode === "monthly" && styles.toggleTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.printButton,
            isExporting && styles.printButtonDisabled,
          ]}
          onPress={handlePrint}
          disabled={isExporting}
        >
          <Text style={styles.printButtonText}>
            {isExporting ? "📄..." : "🖨️"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingTop: 20 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
        }
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading prayer times...</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {viewMode === "daily" ? (
              <View>
                {nextPrayer && (
                  <View style={styles.nextPrayerAlert}>
                    <Text style={styles.alertIcon}>🔔</Text>
                    <View style={styles.alertContent}>
                      <Text style={styles.alertTitle}>Next Prayer</Text>
                      <Text style={styles.alertPrayer}>
                        {nextPrayer.charAt(0).toUpperCase() +
                          nextPrayer.slice(1)}
                      </Text>
                      <Text style={styles.alertTime}>
                        {getCountdownToNext() || "Coming up soon"}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.dailyCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>
                      🕐 Today's Prayer Times
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      {formatCurrentDate()}
                    </Text>
                  </View>

                  {todaysPrayers ? (
                    <View style={styles.prayerList}>
                      {renderPrayerCard(
                        "Fajr",
                        todaysPrayers.fajr_begins,
                        todaysPrayers.fajr_jamah,
                        currentPrayer === "fajr",
                        nextPrayer === "fajr"
                      )}
                      {renderPrayerCard(
                        "Sunrise",
                        todaysPrayers.sunrise,
                        undefined,
                        currentPrayer === "sunrise",
                        nextPrayer === "sunrise"
                      )}
                      {renderPrayerCard(
                        "Zuhr",
                        todaysPrayers.zuhr_begins,
                        todaysPrayers.zuhr_jamah,
                        currentPrayer === "zuhr",
                        nextPrayer === "zuhr"
                      )}
                      {renderPrayerCard(
                        "Asr",
                        todaysPrayers.asr_mithl_1,
                        todaysPrayers.asr_jamah,
                        currentPrayer === "asr",
                        nextPrayer === "asr"
                      )}
                      {renderPrayerCard(
                        "Maghrib",
                        todaysPrayers.maghrib_begins,
                        todaysPrayers.maghrib_jamah,
                        currentPrayer === "maghrib",
                        nextPrayer === "maghrib"
                      )}
                      {renderPrayerCard(
                        "Isha",
                        todaysPrayers.isha_begins,
                        todaysPrayers.isha_jamah,
                        currentPrayer === "isha",
                        nextPrayer === "isha"
                      )}
                    </View>
                  ) : (
                    <View style={styles.noDataSection}>
                      <Text style={styles.noDataIcon}>📅</Text>
                      <Text style={styles.noDataMessage}>
                        No prayer times available for today
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              // Keep your existing monthly view exactly the same
              <View style={styles.monthlyCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>📊 Monthly Timetable</Text>
                  <Text style={styles.cardSubtitle}>
                    {getMonthName(currentMonth)} {currentYear} •{" "}
                    {monthData.length} days available
                  </Text>
                </View>

                {monthData.length > 0 ? (
                  <View style={styles.monthlyTableContainer}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={true}
                      persistentScrollbar={Platform.OS === "android"}
                      style={styles.monthlyHorizontalScroll}
                      contentContainerStyle={{ paddingRight: 8 }}
                    >
                      <View style={styles.monthlyTableContent}>
                        <View style={styles.monthlyTableHeader}>
                          <View
                            style={[styles.monthlyHeaderCell, { width: 50 }]}
                          >
                            <Text style={styles.monthlyHeaderText}>Date</Text>
                          </View>
                          <View
                            style={[styles.monthlyHeaderCell, { width: 50 }]}
                          >
                            <Text style={styles.monthlyHeaderText}>Day</Text>
                          </View>
                          <View
                            style={[styles.monthlyHeaderCell, { width: 100 }]}
                          >
                            <Text style={styles.monthlyHeaderText}>Fajr</Text>
                            <View style={styles.timeTypeRow}>
                              <View style={styles.beginTimeHeaderContainer}>
                                <Text style={styles.beginTimeHeader}>
                                  Begin
                                </Text>
                              </View>
                              <View style={styles.jamahTimeHeaderContainer}>
                                <Text style={styles.jamahTimeHeader}>
                                  Jamah
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View
                            style={[styles.monthlyHeaderCell, { width: 70 }]}
                          >
                            <Text style={styles.monthlyHeaderText}>
                              Sunrise
                            </Text>
                            <View style={styles.timeTypeRow}>
                              <View style={styles.beginTimeHeaderContainer}>
                                <Text style={styles.beginTimeHeader}>
                                  Begin
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View
                            style={[styles.monthlyHeaderCell, { width: 100 }]}
                          >
                            <Text style={styles.monthlyHeaderText}>Zuhr</Text>
                            <View style={styles.timeTypeRow}>
                              <View style={styles.beginTimeHeaderContainer}>
                                <Text style={styles.beginTimeHeader}>
                                  Begin
                                </Text>
                              </View>
                              <View style={styles.jamahTimeHeaderContainer}>
                                <Text style={styles.jamahTimeHeader}>
                                  Jamah
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View
                            style={[styles.monthlyHeaderCell, { width: 100 }]}
                          >
                            <Text style={styles.monthlyHeaderText}>Asr</Text>
                            <View style={styles.timeTypeRow}>
                              <View style={styles.beginTimeHeaderContainer}>
                                <Text style={styles.beginTimeHeader}>
                                  Begin
                                </Text>
                              </View>
                              <View style={styles.jamahTimeHeaderContainer}>
                                <Text style={styles.jamahTimeHeader}>
                                  Jamah
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View
                            style={[styles.monthlyHeaderCell, { width: 100 }]}
                          >
                            <Text style={styles.monthlyHeaderText}>
                              Maghrib
                            </Text>
                            <View style={styles.timeTypeRow}>
                              <View style={styles.beginTimeHeaderContainer}>
                                <Text style={styles.beginTimeHeader}>
                                  Begin
                                </Text>
                              </View>
                              <View style={styles.jamahTimeHeaderContainer}>
                                <Text style={styles.jamahTimeHeader}>
                                  Jamah
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View
                            style={[styles.monthlyHeaderCell, { width: 100 }]}
                          >
                            <Text style={styles.monthlyHeaderText}>Isha</Text>
                            <View style={styles.timeTypeRow}>
                              <View style={styles.beginTimeHeaderContainer}>
                                <Text style={styles.beginTimeHeader}>
                                  Begin
                                </Text>
                              </View>
                              <View style={styles.jamahTimeHeaderContainer}>
                                <Text style={styles.jamahTimeHeader}>
                                  Jamah
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>

                        <ScrollView
                          style={styles.monthlyScrollView}
                          showsVerticalScrollIndicator={true}
                          persistentScrollbar={Platform.OS === "android"}
                          contentContainerStyle={{ paddingBottom: 20 }}
                        >
                          {monthData.map((item, index) => {
                            const date = new Date(item.d_date);
                            const isToday = item.d_date === today;
                            const isWeekend =
                              date.getDay() === 0 || date.getDay() === 6;
                            const dayNames = [
                              "Sun",
                              "Mon",
                              "Tue",
                              "Wed",
                              "Thu",
                              "Fri",
                              "Sat",
                            ];

                            return (
                              <View
                                key={`${item.d_date}-${index}`}
                                style={[
                                  styles.monthlyRow,
                                  isToday && styles.todayRow,
                                  isWeekend && !isToday && styles.weekendRow,
                                ]}
                              >
                                {/* Your existing row content remains the same */}
                                <View
                                  style={[
                                    styles.monthlyDataCell,
                                    { width: 50 },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.monthlyCellText,
                                      isToday && styles.todayText,
                                    ]}
                                  >
                                    {date.getDate()}
                                    {isToday && " 📍"}
                                  </Text>
                                </View>

                                <View
                                  style={[
                                    styles.monthlyDataCell,
                                    { width: 50 },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.monthlyCellText,
                                      isToday && styles.todayText,
                                    ]}
                                  >
                                    {dayNames[date.getDay()]}
                                  </Text>
                                </View>

                                <View
                                  style={[
                                    styles.monthlyDataCell,
                                    { width: 100 },
                                  ]}
                                >
                                  <View style={styles.monthlyTimeContainer}>
                                    <View style={styles.beginTimeContainer}>
                                      <Text
                                        style={[
                                          styles.monthlyBeginTime,
                                          isToday && styles.todayBeginTime,
                                        ]}
                                      >
                                        {formatTime(item.fajr_begins)}
                                      </Text>
                                    </View>
                                    {item.fajr_jamah && (
                                      <View style={styles.jamahTimeContainer}>
                                        <Text
                                          style={[
                                            styles.monthlyJamahTime,
                                            isToday && styles.todayJamahTime,
                                          ]}
                                        >
                                          {formatTime(item.fajr_jamah)}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </View>

                                <View
                                  style={[
                                    styles.monthlyDataCell,
                                    { width: 70 },
                                  ]}
                                >
                                  <View style={styles.monthlyTimeContainer}>
                                    <View style={styles.beginTimeContainer}>
                                      <Text
                                        style={[
                                          styles.monthlyBeginTime,
                                          isToday && styles.todayBeginTime,
                                        ]}
                                      >
                                        {formatTime(item.sunrise)}
                                      </Text>
                                    </View>
                                  </View>
                                </View>

                                <View
                                  style={[
                                    styles.monthlyDataCell,
                                    { width: 100 },
                                  ]}
                                >
                                  <View style={styles.monthlyTimeContainer}>
                                    <View style={styles.beginTimeContainer}>
                                      <Text
                                        style={[
                                          styles.monthlyBeginTime,
                                          isToday && styles.todayBeginTime,
                                        ]}
                                      >
                                        {formatTime(item.zuhr_begins)}
                                      </Text>
                                    </View>
                                    {item.zuhr_jamah && (
                                      <View style={styles.jamahTimeContainer}>
                                        <Text
                                          style={[
                                            styles.monthlyJamahTime,
                                            isToday && styles.todayJamahTime,
                                          ]}
                                        >
                                          {formatTime(item.zuhr_jamah)}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </View>

                                <View
                                  style={[
                                    styles.monthlyDataCell,
                                    { width: 100 },
                                  ]}
                                >
                                  <View style={styles.monthlyTimeContainer}>
                                    <View style={styles.beginTimeContainer}>
                                      <Text
                                        style={[
                                          styles.monthlyBeginTime,
                                          isToday && styles.todayBeginTime,
                                        ]}
                                      >
                                        {formatTime(item.asr_mithl_1)}
                                      </Text>
                                    </View>
                                    {item.asr_jamah && (
                                      <View style={styles.jamahTimeContainer}>
                                        <Text
                                          style={[
                                            styles.monthlyJamahTime,
                                            isToday && styles.todayJamahTime,
                                          ]}
                                        >
                                          {formatTime(item.asr_jamah)}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </View>

                                <View
                                  style={[
                                    styles.monthlyDataCell,
                                    { width: 100 },
                                  ]}
                                >
                                  <View style={styles.monthlyTimeContainer}>
                                    <View style={styles.beginTimeContainer}>
                                      <Text
                                        style={[
                                          styles.monthlyBeginTime,
                                          isToday && styles.todayBeginTime,
                                        ]}
                                      >
                                        {formatTime(item.maghrib_begins)}
                                      </Text>
                                    </View>
                                    {item.maghrib_jamah && (
                                      <View style={styles.jamahTimeContainer}>
                                        <Text
                                          style={[
                                            styles.monthlyJamahTime,
                                            isToday && styles.todayJamahTime,
                                          ]}
                                        >
                                          {formatTime(item.maghrib_jamah)}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </View>

                                <View
                                  style={[
                                    styles.monthlyDataCell,
                                    { width: 100 },
                                  ]}
                                >
                                  <View style={styles.monthlyTimeContainer}>
                                    <View style={styles.beginTimeContainer}>
                                      <Text
                                        style={[
                                          styles.monthlyBeginTime,
                                          isToday && styles.todayBeginTime,
                                        ]}
                                      >
                                        {formatTime(item.isha_begins)}
                                      </Text>
                                    </View>
                                    {item.isha_jamah && (
                                      <View style={styles.jamahTimeContainer}>
                                        <Text
                                          style={[
                                            styles.monthlyJamahTime,
                                            isToday && styles.todayJamahTime,
                                          ]}
                                        >
                                          {formatTime(item.isha_jamah)}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                        </ScrollView>
                      </View>
                    </ScrollView>
                  </View>
                ) : (
                  <View style={styles.noDataSection}>
                    <Text style={styles.noDataIcon}>📊</Text>
                    <Text style={styles.noDataMessage}>
                      No monthly data available for {getMonthName(currentMonth)}{" "}
                      {currentYear}
                    </Text>
                    <Text style={styles.noDataSubMessage}>
                      Total prayer times in database: {prayerTimes.length}
                    </Text>
                  </View>
                )}

                <View style={styles.legend}>
                  <Text style={styles.legendTitle}>Legend</Text>
                  <View style={styles.legendGrid}>
                    <View style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendColor,
                          { backgroundColor: "#4caf50" },
                        ]}
                      />
                      <Text style={styles.legendText}>Begin Times</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendColor,
                          { backgroundColor: "#ff9800" },
                        ]}
                      />
                      <Text style={styles.legendText}>Jamah Times</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendColor,
                          { backgroundColor: colors.primary },
                        ]}
                      />
                      <Text style={styles.legendText}>Today</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendColor,
                          { backgroundColor: "#fff3e0" },
                        ]}
                      />
                      <Text style={styles.legendText}>Weekend</Text>
                    </View>
                  </View>
                  <Text style={styles.legendNote}>
                    📍 Scroll vertically to see all days • Swipe horizontally
                    for all prayer times
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>
        )}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

// Simplified styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },

  // Simple header styles
  header: {
    backgroundColor: "#1B5E20",
    paddingTop: Platform.OS === "ios" ? 44 : StatusBar.currentHeight || 24,
    paddingHorizontal: 20,
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },

  headerExpanded: {
    paddingBottom: 24,
  },

  headerCollapsed: {
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logoContainer: {
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  mosqueTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
    letterSpacing: 0.5,
  },

  headerTime: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 4,
    letterSpacing: -1,
  },

  headerTimeCollapsed: {
    fontSize: 18,
    marginBottom: 0,
  },

  headerDate: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "500",
  },

  headerDateCollapsed: {
    fontSize: 12,
  },

  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginVertical: 8,
  },

  scrollContent: {
    flex: 1,
  },

  logoPlaceholder: {
    fontSize: 40,
    color: "#fff",
  },

  dailyCard: {
    margin: 16,
    marginTop: 4,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
    overflow: "hidden",
  },

  nextPrayerAlert: {
    margin: 20,
    marginBottom: 8,
    backgroundColor: "#e3f2fd",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 5,
    borderLeftColor: "#2196f3",
    shadowColor: "#2196f3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  monthlyCard: {
    margin: 12,
    marginTop: 4,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
    flex: 1,
  },

  monthlyTableContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    margin: 8,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  monthlyScrollView: {
    flex: 1,
    backgroundColor: "#fff",
    maxHeight: height * 0.55,
  },

  cardHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  legend: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    alignItems: "center",
  },

  legendTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },

  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
    justifyContent: "center",
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  legendText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
  },

  legendNote: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 14,
  },

  bottomSpacing: {
    height: Platform.OS === "ios" ? 60 : 40,
  },

  toggleWrapper: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#1B5E20",
    shadowColor: "#1B5E20",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  toggleTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  printButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  printButtonDisabled: {
    opacity: 0.6,
  },
  printButtonText: {
    fontSize: 16,
  },

  monthlyHorizontalScroll: {
    flex: 1,
  },

  scrollHintContainer: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },

  scrollHintText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },

  tableOverlay: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 30,
    backgroundColor: "transparent",
    pointerEvents: "none",
    zIndex: 1,
  },
  prayerCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
    position: "relative",
  },
  activePrayerCard: {
    backgroundColor: "#1B5E20",
    borderColor: "#1B5E20",
    shadowColor: "#1B5E20",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  nextPrayerCard: {
    borderColor: "#2196f3",
    borderWidth: 2,
    backgroundColor: "#fafffe",
  },
  prayerCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  prayerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  prayerIcon: {
    fontSize: 20,
  },
  compactTimeSection: {
    marginTop: 2,
  },
  compactTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 1,
  },
  compactTimeLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  prayerName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  compactPrayerTime: {
    fontSize: 14,
    fontWeight: "800",
  },
  compactJamahTime: {
    fontSize: 14,
    fontWeight: "800",
  },
  compactStatusContainer: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  compactStatusBadge: {
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  compactNextBadge: {
    backgroundColor: "#e3f2fd",
  },
  compactStatusText: {
    fontSize: 7,
    fontWeight: "800",
    color: "#1B5E20",
    letterSpacing: 0.3,
  },
  prayerList: {
    padding: 16,
    gap: 8,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },

  alertIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1565c0",
    marginBottom: 4,
  },
  alertPrayer: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0d47a1",
    marginBottom: 2,
  },
  alertTime: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1976d2",
  },

  prayerInfo: {
    flex: 1,
  },

  monthlyTableHeader: {
    flexDirection: "row",
    backgroundColor: "#1B5E20",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#fff",
    minHeight: 80,
  },
  monthlyHeaderCell: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  monthlyHeaderText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  timeTypeRow: {
    flexDirection: "row",
    gap: 2,
    justifyContent: "center",
  },
  beginTimeHeaderContainer: {
    backgroundColor: "#4caf50",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 35,
  },
  jamahTimeHeaderContainer: {
    backgroundColor: "#ff9800",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 35,
  },
  beginTimeHeader: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  jamahTimeHeader: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },

  monthlyRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    minHeight: 50,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  monthlyDataCell: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  monthlyBeginTime: {
    fontSize: 11,
    color: "#2e7d32",
    textAlign: "center",
    fontWeight: "700",
  },
  monthlyJamahTime: {
    fontSize: 10,
    color: "#f57c00",
    textAlign: "center",
    fontWeight: "600",
    marginTop: 2,
  },
  todayRow: {
    backgroundColor: "#e8f5e9",
    borderLeftWidth: 4,
    borderLeftColor: "#1B5E20",
  },
  weekendRow: {
    backgroundColor: "#fff3e0",
  },
  monthlyCellText: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
    fontWeight: "600",
  },
  monthlyTimeContainer: {
    alignItems: "center",
    gap: 4,
  },
  beginTimeContainer: {
    backgroundColor: "#e8f5e9",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#4caf50",
    minWidth: 50,
  },
  jamahTimeContainer: {
    backgroundColor: "#fff3e0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#ff9800",
    minWidth: 50,
  },
  todayBeginTime: {
    color: "#1B5E20",
    fontWeight: "900",
  },
  todayJamahTime: {
    color: "#e65100",
    fontWeight: "900",
  },
  todayText: {
    color: "#1B5E20",
    fontWeight: "800",
  },

  noDataCard: {
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  noDataSection: {
    padding: 40,
    alignItems: "center",
  },
  noDataIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noDataTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  noDataText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  noDataMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 8,
  },
  noDataSubMessage: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
  },
  refreshButton: {
    backgroundColor: "#1B5E20",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: "#1B5E20",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },

  monthlyTableContent: {
    minWidth: 670,
  },
});

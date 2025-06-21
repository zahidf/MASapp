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
  const [logoSvg, setLogoSvg] = useState<string>("");

  const colors = Colors[colorScheme ?? "light"];
  const today = getTodayString();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

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

  // Simplified prayer card render function with better spacing
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
          <View style={styles.prayerLeftContent}>
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
              <Text style={[styles.prayerTime, { color: textColor }]}>
                {formatTime(time)}
              </Text>
            </View>
          </View>

          <View style={styles.prayerRightContent}>
            {jamah && (
              <View style={styles.jamahSection}>
                <Text style={[styles.jamahLabel, { color: subtextColor }]}>
                  Jamah
                </Text>
                <Text style={[styles.jamahTime, { color: textColor }]}>
                  {formatTime(jamah)}
                </Text>
              </View>
            )}

            {(isActive || isNext) && (
              <View style={styles.statusContainer}>
                {isActive && (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>NOW</Text>
                  </View>
                )}
                {isNext && !isActive && (
                  <View style={[styles.statusBadge, styles.nextBadge]}>
                    <Text
                      style={[styles.statusText, { color: colors.primary }]}
                    >
                      {getCountdownToNext() || "NEXT"}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  if (!Array.isArray(prayerTimes) || prayerTimes.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Simplified Header */}
        <View style={styles.simpleHeader}>
          <View style={styles.logoContainer}>
            {logoSvg ? (
              <SvgXml xml={logoSvg} width={48} height={48} />
            ) : (
              <Text style={styles.logoPlaceholder}>🕌</Text>
            )}
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.mosqueTitle}>Masjid Abubakr Siddique</Text>
            <Text style={styles.headerTime}>{formatCurrentTime()}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.noDataContainer}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
          }
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

      {/* Simplified Header */}
      <View style={styles.simpleHeader}>
        <View style={styles.logoContainer}>
          {logoSvg ? (
            <SvgXml xml={logoSvg} width={48} height={48} />
          ) : (
            <Text style={styles.logoPlaceholder}>🕌</Text>
          )}
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.mosqueTitle}>Masjid Abubakr Siddique</Text>
          <Text style={styles.headerTime}>{formatCurrentTime()}</Text>
          <Text style={styles.headerDate}>{formatCurrentDate()}</Text>
        </View>
      </View>

      {/* Simplified Toggle */}
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
              Today
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

      {/* Scrollable Content with better spacing */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading prayer times...</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {viewMode === "daily" ? (
              <View style={styles.dailyView}>
                {/* Next Prayer Alert - Simplified */}
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

                {/* Prayer Cards - Better spacing */}
                <View style={styles.prayersList}>
                  {todaysPrayers ? (
                    <>
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
                    </>
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
              // Monthly view with improved table layout
              <View style={styles.monthlyView}>
                <View style={styles.monthlyHeader}>
                  <Text style={styles.monthlyTitle}>
                    {getMonthName(currentMonth)} {currentYear}
                  </Text>
                  <Text style={styles.monthlySubtitle}>
                    {monthData.length} days available
                  </Text>
                </View>

                {monthData.length > 0 ? (
                  <View style={styles.tableContainer}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={true}
                      style={styles.horizontalScroll}
                    >
                      <View style={styles.tableContent}>
                        {/* Simplified table header */}
                        <View style={styles.tableHeader}>
                          <View style={[styles.headerCell, { width: 60 }]}>
                            <Text style={styles.headerText}>Date</Text>
                          </View>
                          <View style={[styles.headerCell, { width: 80 }]}>
                            <Text style={styles.headerText}>Fajr</Text>
                          </View>
                          <View style={[styles.headerCell, { width: 80 }]}>
                            <Text style={styles.headerText}>Zuhr</Text>
                          </View>
                          <View style={[styles.headerCell, { width: 80 }]}>
                            <Text style={styles.headerText}>Asr</Text>
                          </View>
                          <View style={[styles.headerCell, { width: 80 }]}>
                            <Text style={styles.headerText}>Maghrib</Text>
                          </View>
                          <View style={[styles.headerCell, { width: 80 }]}>
                            <Text style={styles.headerText}>Isha</Text>
                          </View>
                        </View>

                        {/* Simplified table rows */}
                        <ScrollView style={styles.tableScroll}>
                          {monthData.map((item, index) => {
                            const date = new Date(item.d_date);
                            const isToday = item.d_date === today;

                            return (
                              <View
                                key={`${item.d_date}-${index}`}
                                style={[
                                  styles.tableRow,
                                  isToday && styles.todayRow,
                                ]}
                              >
                                <View style={[styles.dataCell, { width: 60 }]}>
                                  <Text
                                    style={[
                                      styles.cellText,
                                      isToday && styles.todayText,
                                    ]}
                                  >
                                    {date.getDate()}
                                    {isToday && " 📍"}
                                  </Text>
                                </View>

                                <View style={[styles.dataCell, { width: 80 }]}>
                                  <Text style={styles.timeText}>
                                    {formatTime(item.fajr_begins)}
                                  </Text>
                                  {item.fajr_jamah && (
                                    <Text style={styles.jamahText}>
                                      {formatTime(item.fajr_jamah)}
                                    </Text>
                                  )}
                                </View>

                                <View style={[styles.dataCell, { width: 80 }]}>
                                  <Text style={styles.timeText}>
                                    {formatTime(item.zuhr_begins)}
                                  </Text>
                                  {item.zuhr_jamah && (
                                    <Text style={styles.jamahText}>
                                      {formatTime(item.zuhr_jamah)}
                                    </Text>
                                  )}
                                </View>

                                <View style={[styles.dataCell, { width: 80 }]}>
                                  <Text style={styles.timeText}>
                                    {formatTime(item.asr_mithl_1)}
                                  </Text>
                                  {item.asr_jamah && (
                                    <Text style={styles.jamahText}>
                                      {formatTime(item.asr_jamah)}
                                    </Text>
                                  )}
                                </View>

                                <View style={[styles.dataCell, { width: 80 }]}>
                                  <Text style={styles.timeText}>
                                    {formatTime(item.maghrib_begins)}
                                  </Text>
                                  {item.maghrib_jamah && (
                                    <Text style={styles.jamahText}>
                                      {formatTime(item.maghrib_jamah)}
                                    </Text>
                                  )}
                                </View>

                                <View style={[styles.dataCell, { width: 80 }]}>
                                  <Text style={styles.timeText}>
                                    {formatTime(item.isha_begins)}
                                  </Text>
                                  {item.isha_jamah && (
                                    <Text style={styles.jamahText}>
                                      {formatTime(item.isha_jamah)}
                                    </Text>
                                  )}
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
                  </View>
                )}
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// Improved styles with better spacing and layout
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },

  // Simplified header
  simpleHeader: {
    backgroundColor: "#1B5E20",
    paddingTop: Platform.OS === "ios" ? 44 : StatusBar.currentHeight || 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },

  logoContainer: {
    marginRight: 16,
  },

  headerTextContainer: {
    flex: 1,
  },

  mosqueTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },

  headerTime: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 2,
  },

  headerDate: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "500",
  },

  logoPlaceholder: {
    fontSize: 32,
    color: "#fff",
  },

  // Improved toggle
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    margin: 20,
  },

  toggleWrapper: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  toggleButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },

  toggleButtonActive: {
    backgroundColor: "#1B5E20",
  },

  toggleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },

  toggleTextActive: {
    color: "#fff",
  },

  printButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  printButtonDisabled: {
    opacity: 0.6,
  },

  printButtonText: {
    fontSize: 18,
  },

  // Improved scroll content
  scrollContent: {
    flex: 1,
  },

  scrollContentContainer: {
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
  },

  // Daily view improvements
  dailyView: {
    padding: 20,
  },

  nextPrayerAlert: {
    backgroundColor: "#e3f2fd",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#2196f3",
  },

  alertIcon: {
    fontSize: 28,
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
    fontSize: 18,
    fontWeight: "700",
    color: "#0d47a1",
    marginBottom: 2,
  },

  alertTime: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1976d2",
  },

  // Improved prayer cards
  prayersList: {
    gap: 16,
  },

  prayerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  activePrayerCard: {
    backgroundColor: "#1B5E20",
    borderColor: "#1B5E20",
    shadowOpacity: 0.2,
    elevation: 6,
  },

  nextPrayerCard: {
    borderColor: "#2196f3",
    borderWidth: 2,
    backgroundColor: "#fafffe",
  },

  prayerCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  prayerLeftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  prayerRightContent: {
    alignItems: "flex-end",
  },

  prayerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  prayerIcon: {
    fontSize: 20,
  },

  prayerInfo: {
    flex: 1,
  },

  prayerName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },

  prayerTime: {
    fontSize: 16,
    fontWeight: "600",
  },

  jamahSection: {
    alignItems: "flex-end",
    marginBottom: 8,
  },

  jamahLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },

  jamahTime: {
    fontSize: 14,
    fontWeight: "600",
  },

  statusContainer: {
    alignItems: "flex-end",
  },

  statusBadge: {
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 40,
    alignItems: "center",
  },

  nextBadge: {
    backgroundColor: "#e3f2fd",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1B5E20",
  },

  // Monthly view improvements
  monthlyView: {
    padding: 20,
  },

  monthlyHeader: {
    marginBottom: 20,
    alignItems: "center",
  },

  monthlyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1B5E20",
    marginBottom: 4,
  },

  monthlySubtitle: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },

  tableContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },

  horizontalScroll: {
    flex: 1,
  },

  tableContent: {
    minWidth: 480,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1B5E20",
    paddingVertical: 16,
  },

  headerCell: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  headerText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  tableScroll: {
    maxHeight: height * 0.5,
  },

  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingVertical: 12,
  },

  todayRow: {
    backgroundColor: "#e8f5e9",
    borderLeftWidth: 4,
    borderLeftColor: "#1B5E20",
  },

  dataCell: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  cellText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },

  todayText: {
    color: "#1B5E20",
    fontWeight: "700",
  },

  timeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },

  jamahText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#666",
    textAlign: "center",
    marginTop: 2,
  },

  // Loading and no data states
  loadingContainer: {
    padding: 60,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },

  noDataContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  noDataCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    maxWidth: 320,
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
    fontWeight: "700",
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
  },
});

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { PrayerName, PrayerTime } from "@/types/prayer";
import { getCurrentPrayerAndNext, getTodayString } from "@/utils/dateHelpers";

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

  const colors = Colors[colorScheme ?? "light"];
  const today = getTodayString();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Helper function to format time to hh:mm
  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return "N/A";
    // If time is already in hh:mm format, return as is
    if (timeString.length === 5 && timeString.includes(":")) {
      return timeString;
    }
    // If time includes seconds, remove them
    if (timeString.includes(":")) {
      const parts = timeString.split(":");
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`;
      }
    }
    return timeString;
  };

  useEffect(() => {
    if (!prayerTimes || prayerTimes.length === 0) {
      setMonthData([]);
      return;
    }

    // Get all days for the current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-01`;
    const monthEnd = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-${String(daysInMonth).padStart(2, "0")}`;

    console.log("Month range:", monthStart, "to", monthEnd);
    console.log("Total prayer times available:", prayerTimes.length);

    const filtered = prayerTimes
      .filter((pt) => {
        if (!pt || !pt.d_date) return false;
        const isInRange = pt.d_date >= monthStart && pt.d_date <= monthEnd;
        return isInRange;
      })
      .sort((a, b) => a.d_date.localeCompare(b.d_date));

    console.log("Filtered month data:", filtered.length, "days");
    setMonthData(filtered);
  }, [prayerTimes, currentMonth, currentYear]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Pulse animation for active prayer
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

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
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

            {/* Compact Time Section */}
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

          {/* Compact status badges */}
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
                    NEXT
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
        <View style={styles.gradientHeader}>
          <Text style={styles.greetingText}>{getGreeting()}</Text>
          <Text style={styles.mosqueTitle}>🕌 Masjid Abubakr Siddique</Text>
          <Text style={styles.headerTime}>{formatCurrentTime()}</Text>
          <Text style={styles.headerDate}>{formatCurrentDate()}</Text>
        </View>
        <ScrollView
          style={styles.scrollContent}
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

      {/* Enhanced Header */}
      <View style={styles.gradientHeader}>
        <Text style={styles.greetingText}>{getGreeting()}</Text>
        <Text style={styles.mosqueTitle}>🕌 Masjid Abubakr Siddique</Text>
        <Text style={styles.headerTime}>{formatCurrentTime()}</Text>
        <Text style={styles.headerDate}>{formatCurrentDate()}</Text>
      </View>

      {/* Subtle Toggle */}
      <View style={styles.subtleToggleContainer}>
        <View style={styles.subtleToggleWrapper}>
          <TouchableOpacity
            style={[
              styles.subtleToggleButton,
              viewMode === "daily" && styles.subtleToggleButtonActive,
            ]}
            onPress={() => setViewMode("daily")}
          >
            <Text
              style={[
                styles.subtleToggleText,
                viewMode === "daily" && styles.subtleToggleTextActive,
              ]}
            >
              Daily
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subtleToggleButton,
              viewMode === "monthly" && styles.subtleToggleButtonActive,
            ]}
            onPress={() => setViewMode("monthly")}
          >
            <Text
              style={[
                styles.subtleToggleText,
                viewMode === "monthly" && styles.subtleToggleTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Enhanced Content */}
      <ScrollView
        style={styles.scrollContent}
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
              <View>
                {/* Next Prayer Alert */}
                {nextPrayer && (
                  <View style={styles.nextPrayerAlert}>
                    <Text style={styles.alertIcon}>🔔</Text>
                    <View style={styles.alertContent}>
                      <Text style={styles.alertTitle}>Next Prayer</Text>
                      <Text style={styles.alertPrayer}>
                        {nextPrayer.charAt(0).toUpperCase() +
                          nextPrayer.slice(1)}
                      </Text>
                      <Text style={styles.alertTime}>Coming up soon</Text>
                    </View>
                  </View>
                )}

                {/* Daily Prayer Times */}
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
                    {/* Enhanced Table Header */}
                    <View style={styles.monthlyTableHeader}>
                      {/* Date Column */}
                      <View style={[styles.monthlyHeaderCell, { width: 50 }]}>
                        <Text style={styles.monthlyHeaderText}>Date</Text>
                      </View>

                      {/* Day Column */}
                      <View style={[styles.monthlyHeaderCell, { width: 50 }]}>
                        <Text style={styles.monthlyHeaderText}>Day</Text>
                      </View>

                      {/* Fajr Column */}
                      <View style={[styles.monthlyHeaderCell, { width: 100 }]}>
                        <Text style={styles.monthlyHeaderText}>Fajr</Text>
                        <View style={styles.timeTypeRow}>
                          <View style={styles.beginTimeHeaderContainer}>
                            <Text style={styles.beginTimeHeader}>Begin</Text>
                          </View>
                          <View style={styles.jamahTimeHeaderContainer}>
                            <Text style={styles.jamahTimeHeader}>Jamah</Text>
                          </View>
                        </View>
                      </View>

                      {/* Sunrise Column */}
                      <View style={[styles.monthlyHeaderCell, { width: 70 }]}>
                        <Text style={styles.monthlyHeaderText}>Sunrise</Text>
                        <View style={styles.timeTypeRow}>
                          <View style={styles.beginTimeHeaderContainer}>
                            <Text style={styles.beginTimeHeader}>Begin</Text>
                          </View>
                        </View>
                      </View>

                      {/* Zuhr Column */}
                      <View style={[styles.monthlyHeaderCell, { width: 100 }]}>
                        <Text style={styles.monthlyHeaderText}>Zuhr</Text>
                        <View style={styles.timeTypeRow}>
                          <View style={styles.beginTimeHeaderContainer}>
                            <Text style={styles.beginTimeHeader}>Begin</Text>
                          </View>
                          <View style={styles.jamahTimeHeaderContainer}>
                            <Text style={styles.jamahTimeHeader}>Jamah</Text>
                          </View>
                        </View>
                      </View>

                      {/* Asr Column */}
                      <View style={[styles.monthlyHeaderCell, { width: 100 }]}>
                        <Text style={styles.monthlyHeaderText}>Asr</Text>
                        <View style={styles.timeTypeRow}>
                          <View style={styles.beginTimeHeaderContainer}>
                            <Text style={styles.beginTimeHeader}>Begin</Text>
                          </View>
                          <View style={styles.jamahTimeHeaderContainer}>
                            <Text style={styles.jamahTimeHeader}>Jamah</Text>
                          </View>
                        </View>
                      </View>

                      {/* Maghrib Column */}
                      <View style={[styles.monthlyHeaderCell, { width: 100 }]}>
                        <Text style={styles.monthlyHeaderText}>Maghrib</Text>
                        <View style={styles.timeTypeRow}>
                          <View style={styles.beginTimeHeaderContainer}>
                            <Text style={styles.beginTimeHeader}>Begin</Text>
                          </View>
                          <View style={styles.jamahTimeHeaderContainer}>
                            <Text style={styles.jamahTimeHeader}>Jamah</Text>
                          </View>
                        </View>
                      </View>

                      {/* Isha Column */}
                      <View style={[styles.monthlyHeaderCell, { width: 100 }]}>
                        <Text style={styles.monthlyHeaderText}>Isha</Text>
                        <View style={styles.timeTypeRow}>
                          <View style={styles.beginTimeHeaderContainer}>
                            <Text style={styles.beginTimeHeader}>Begin</Text>
                          </View>
                          <View style={styles.jamahTimeHeaderContainer}>
                            <Text style={styles.jamahTimeHeader}>Jamah</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Scrollable Content */}
                    <ScrollView
                      style={styles.monthlyScrollView}
                      showsVerticalScrollIndicator={true}
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
                            {/* Date Cell */}
                            <View
                              style={[styles.monthlyDataCell, { width: 50 }]}
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

                            {/* Day Cell */}
                            <View
                              style={[styles.monthlyDataCell, { width: 50 }]}
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

                            {/* Prayer Times - keeping existing structure */}
                            <View
                              style={[styles.monthlyDataCell, { width: 100 }]}
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
                              style={[styles.monthlyDataCell, { width: 70 }]}
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
                              style={[styles.monthlyDataCell, { width: 100 }]}
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
                              style={[styles.monthlyDataCell, { width: 100 }]}
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
                              style={[styles.monthlyDataCell, { width: 100 }]}
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
                              style={[styles.monthlyDataCell, { width: 100 }]}
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

                {/* Enhanced Legend with clearer colors */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  gradientHeader: {
    backgroundColor: "#1B5E20",
    paddingTop: Platform.OS === "ios" ? 44 : StatusBar.currentHeight || 24,
    paddingBottom: 24,
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
  greetingText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
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
  headerDate: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "500",
  },
  prayerCard: {
    backgroundColor: "#fff",
    borderRadius: 12, // Reduced from 16
    borderWidth: 1.5, // Reduced from 2
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, // Reduced shadow
    shadowOpacity: 0.03, // Reduced shadow
    shadowRadius: 3, // Reduced shadow
    elevation: 2, // Reduced elevation
    position: "relative",
  },

  activePrayerCard: {
    backgroundColor: "#1B5E20",
    borderColor: "#1B5E20",
    shadowColor: "#1B5E20",
    shadowOffset: { width: 0, height: 3 }, // Reduced shadow
    shadowOpacity: 0.2, // Reduced shadow
    shadowRadius: 6, // Reduced shadow
    elevation: 5, // Reduced elevation
  },

  nextPrayerCard: {
    borderColor: "#2196f3",
    borderWidth: 2,
    backgroundColor: "#fafffe",
  },

  prayerCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12, // Reduced from 16
    gap: 12, // Reduced from 16
  },

  prayerIconContainer: {
    width: 44, // Reduced from 56
    height: 44, // Reduced from 56
    borderRadius: 22, // Adjusted
    alignItems: "center",
    justifyContent: "center",
  },

  prayerIcon: {
    fontSize: 20, // Reduced from 24
  },

  compactTimeSection: {
    marginTop: 2, // Reduced from 4
  },

  compactTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 1, // Reduced from 2
  },

  compactTimeLabel: {
    fontSize: 10, // Reduced from 12
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  prayerName: {
    fontSize: 16, // Reduced from 18
    fontWeight: "700",
    marginBottom: 3, // Reduced from 4
    letterSpacing: 0.2,
  },

  compactPrayerTime: {
    fontSize: 14, // Reduced from 15
    fontWeight: "800",
  },

  compactJamahTime: {
    fontSize: 14, // Reduced from 15
    fontWeight: "800",
  },

  // Compact status badges
  compactStatusContainer: {
    position: "absolute",
    top: 6, // Reduced from 8
    right: 6, // Reduced from 8
  },

  compactStatusBadge: {
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 5, // Reduced from 6
    paddingVertical: 1, // Reduced from 2
    borderRadius: 4, // Reduced from 6
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
    fontSize: 7, // Reduced from 8
    fontWeight: "800",
    color: "#1B5E20",
    letterSpacing: 0.3,
  },

  // Compact Prayer List
  prayerList: {
    padding: 16, // Reduced from 20
    gap: 8, // Reduced from 12
  },

  // Subtle Toggle Styles
  subtleToggleContainer: {
    alignItems: "center",
    marginVertical: 12, // Reduced margin
  },

  subtleToggleWrapper: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },

  subtleToggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },

  subtleToggleButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  subtleToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6c757d",
    letterSpacing: 0.2,
  },

  subtleToggleTextActive: {
    color: "#1B5E20",
    fontWeight: "700",
  },

  // Compact Daily Card
  dailyCard: {
    margin: 16, // Reduced from 20
    marginTop: 0,
    backgroundColor: "#fff",
    borderRadius: 16, // Reduced from 20
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, // Reduced shadow
    shadowOpacity: 0.08, // Reduced shadow
    shadowRadius: 8, // Reduced shadow
    elevation: 6, // Reduced elevation
    overflow: "hidden",
  },

  // Compact Card Header
  cardHeader: {
    padding: 18, // Reduced from 24
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  cardTitle: {
    fontSize: 20, // Reduced from 22
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 3, // Reduced from 4
    letterSpacing: 0.2,
  },

  cardSubtitle: {
    fontSize: 13, // Reduced from 14
    color: "#666",
    fontWeight: "500",
  },
  toggleContainer: {
    flexDirection: "row",
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: "#1B5E20",
    shadowColor: "#1B5E20",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleIcon: {
    fontSize: 18,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
    letterSpacing: 0.3,
  },
  toggleButtonTextActive: {
    color: "#fff",
  },
  scrollContent: {
    flex: 1,
  },
  nextPrayerAlert: {
    margin: 20,
    marginBottom: 16,
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

  monthlyCard: {
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
    flex: 1,
  },

  prayerInfo: {
    flex: 1,
  },
  timeSection: {
    marginTop: 4,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  prayerTime: {
    fontSize: 15,
    fontWeight: "800",
  },
  jamahTime: {
    fontSize: 15,
    fontWeight: "800",
  },
  // Smaller, corner-positioned status badges
  statusContainer: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  statusBadge: {
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  nextBadge: {
    backgroundColor: "#e3f2fd",
  },
  statusText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#1B5E20",
    letterSpacing: 0.5,
  },
  monthlyTableContainer: {
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
  monthlyTableWrapper: {
    flex: 1,
    maxHeight: height * 0.6,
  },

  monthlyScrollView: {
    flex: 1,
    backgroundColor: "#fff",
    maxHeight: height * 0.45,
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

  monthlyHorizontalScroll: {
    flex: 1,
  },

  monthlyTable: {
    flex: 1,
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
  // Enhanced color-coded time displays
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
  weekendBeginTime: {
    color: "#388e3c",
    fontWeight: "800",
  },
  weekendJamahTime: {
    color: "#f57c00",
    fontWeight: "800",
  },
  todayText: {
    color: "#1B5E20",
    fontWeight: "800",
  },
  weekendText: {
    color: "#f57c00",
    fontWeight: "700",
  },
  legend: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    alignItems: "center",
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 12,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  legendText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  legendNote: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 16,
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
  bottomSpacing: {
    height: Platform.OS === "ios" ? 100 : 80,
  },
});

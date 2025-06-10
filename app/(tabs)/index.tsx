import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
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
  Share,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { PrayerTimeCard } from "@/components/prayer/PrayerTimeCard";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { PrayerName, PrayerTime } from "@/types/prayer";
import {
  extractPrayersFromTime,
  formatTimeForDisplay,
  getCurrentPrayerAndNext,
  getMonthName,
  getTimeUntilNext,
  getTodayString,
} from "@/utils/dateHelpers";
import { generatePDFHTML } from "@/utils/pdfGenerator";

const { width } = Dimensions.get("window");

type ViewMode = "daily" | "monthly";

export default function TodayScreen() {
  const colorScheme = useColorScheme();
  const { prayerTimes, refreshData, isLoading } = usePrayerTimes();
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [todaysPrayers, setTodaysPrayers] = useState<PrayerTime | null>(null);
  const [currentPrayer, setCurrentPrayer] = useState<PrayerName | null>(null);
  const [nextPrayer, setNextPrayer] = useState<PrayerName | null>(null);
  const [timeUntilNext, setTimeUntilNext] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPrinting, setIsPrinting] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [monthData, setMonthData] = useState<PrayerTime[]>([]);

  const colors = Colors[colorScheme ?? "light"];
  const today = getTodayString();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    if (!prayerTimes || prayerTimes.length === 0) {
      setMonthData([]);
      return;
    }

    const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-01`;
    const monthEnd = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-31`;

    console.log("🗓️ Filtering monthly data:", { monthStart, monthEnd });

    const filtered = prayerTimes
      .filter((pt) => {
        if (!pt || !pt.d_date) return false;
        return pt.d_date >= monthStart && pt.d_date <= monthEnd;
      })
      .sort((a, b) => a.d_date.localeCompare(b.d_date));

    console.log("📊 Filtered monthly data:", filtered.length, "items");
    console.log("Sample filtered data:", filtered.slice(0, 3));

    setMonthData(filtered);
  }, [prayerTimes, currentMonth, currentYear]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

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
      console.log("🔍 Finding today's prayers for:", today);

      if (!Array.isArray(prayerTimes) || prayerTimes.length === 0) {
        console.log("❌ No prayer times available");
        setTodaysPrayers(null);
        return;
      }

      const todayData = prayerTimes.find((pt) => pt && pt.d_date === today);
      console.log("📅 Today's data found:", todayData ? "YES" : "NO");

      if (todayData && typeof todayData === "object") {
        setTodaysPrayers(todayData);

        try {
          const { current, next } = getCurrentPrayerAndNext(todayData);
          setCurrentPrayer(current);
          setNextPrayer(next);

          const nextPrayerTimeProperty = getNextPrayerTimeProperty(next);
          if (nextPrayerTimeProperty && todayData[nextPrayerTimeProperty]) {
            const nextPrayerTime = todayData[nextPrayerTimeProperty] as string;
            const timeUntil = getTimeUntilNext(nextPrayerTime);
            setTimeUntilNext(timeUntil);
          } else {
            setTimeUntilNext("Unknown");
          }
        } catch (error) {
          setCurrentPrayer(null);
          setNextPrayer("fajr");
          setTimeUntilNext("Unknown");
        }
      } else {
        setTodaysPrayers(null);
      }
    };

    updateTodaysPrayers();
    const interval = setInterval(updateTodaysPrayers, 60000);
    return () => clearInterval(interval);
  }, [prayerTimes, today]);

  const getNextPrayerTimeProperty = (
    prayerName: PrayerName
  ): keyof PrayerTime | null => {
    switch (prayerName) {
      case "fajr":
        return "fajr_begins";
      case "sunrise":
        return "sunrise";
      case "zuhr":
        return "zuhr_begins";
      case "asr":
        return "asr_mithl_1";
      case "maghrib":
        return "maghrib_begins";
      case "isha":
        return "isha_begins";
      default:
        return null;
    }
  };

  const handleShare = async () => {
    if (!todaysPrayers) return;

    try {
      const prayers = extractPrayersFromTime(todaysPrayers);
      const date = new Date(todaysPrayers.d_date);
      const dateStr = date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      let message = `🕌 Masjid Abubakr Siddique Prayer Times\n${dateStr}\n\n`;
      prayers.forEach((prayer) => {
        if (prayer.jamah && prayer.jamah.trim() !== "") {
          message += `${prayer.name}: ${prayer.begins} (Jamah: ${prayer.jamah})\n`;
        } else {
          message += `${prayer.name}: ${prayer.begins}\n`;
        }
      });

      await Share.share({ message, title: "Prayer Times" });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);

    try {
      let html = "";

      if (viewMode === "daily" && todaysPrayers) {
        html = await generatePDFHTML([todaysPrayers], "day");
      } else if (viewMode === "monthly") {
        if (monthData.length === 0) {
          Alert.alert("Error", "No data available for current month");
          setIsPrinting(false);
          return;
        }
        html = await generatePDFHTML(monthData, "month");
      } else {
        Alert.alert("Error", "No data available to print");
        setIsPrinting(false);
        return;
      }

      const { uri } = await Print.printToFileAsync({ html, base64: false });

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
      Alert.alert("Error", "Failed to generate PDF. Please try again.");
    } finally {
      setIsPrinting(false);
    }
  };

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

  const renderMonthlyTimetable = () => {
    console.log(
      "🗓️ Rendering monthly timetable with:",
      monthData.length,
      "items"
    );

    if (monthData.length === 0) {
      return (
        <ThemedView
          style={[styles.noDataCard, { backgroundColor: colors.surface }]}
        >
          <View style={styles.noDataIconContainer}>
            <IconSymbol name="calendar" size={48} color={colors.primary} />
          </View>
          <ThemedText type="subtitle" style={styles.noDataTitle}>
            No Monthly Data Available
          </ThemedText>
          <ThemedText style={styles.noDataText}>
            Prayer times for {getMonthName(currentMonth)} {currentYear} haven't
            been uploaded yet.
            {"\n"}Total prayer times available: {prayerTimes.length}
          </ThemedText>
        </ThemedView>
      );
    }

    return (
      <ThemedView
        style={[styles.monthlyContainer, { backgroundColor: colors.surface }]}
      >
        <View style={styles.monthlyHeader}>
          <ThemedText style={[styles.monthlyTitle, { color: colors.text }]}>
            {getMonthName(currentMonth)} {currentYear}
          </ThemedText>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.monthlyScrollView}
          contentContainerStyle={{ minWidth: "100%" }}
        >
          <View style={styles.monthlyTable}>
            {/* Header Row */}
            <View
              style={[
                styles.monthlyHeaderRow,
                { backgroundColor: colors.primary },
              ]}
            >
              <View style={[styles.monthlyCell, styles.dateCell]}>
                <ThemedText style={styles.monthlyHeaderText}>Date</ThemedText>
              </View>
              <View style={[styles.monthlyCell, styles.dayCell]}>
                <ThemedText style={styles.monthlyHeaderText}>Day</ThemedText>
              </View>
              <View style={[styles.monthlyCell, styles.timeCell]}>
                <ThemedText style={styles.monthlyHeaderText}>Fajr</ThemedText>
              </View>
              <View style={[styles.monthlyCell, styles.timeCell]}>
                <ThemedText style={styles.monthlyHeaderText}>
                  Sunrise
                </ThemedText>
              </View>
              <View style={[styles.monthlyCell, styles.timeCell]}>
                <ThemedText style={styles.monthlyHeaderText}>Zuhr</ThemedText>
              </View>
              <View style={[styles.monthlyCell, styles.timeCell]}>
                <ThemedText style={styles.monthlyHeaderText}>Asr</ThemedText>
              </View>
              <View style={[styles.monthlyCell, styles.timeCell]}>
                <ThemedText style={styles.monthlyHeaderText}>
                  Maghrib
                </ThemedText>
              </View>
              <View style={[styles.monthlyCell, styles.timeCell]}>
                <ThemedText style={styles.monthlyHeaderText}>Isha</ThemedText>
              </View>
            </View>

            {/* Data Rows */}
            {monthData.map((prayerTime: PrayerTime, index: number) => {
              const date = new Date(prayerTime.d_date);
              const isToday = prayerTime.d_date === today;
              const isMonday = date.getDay() === 1;
              const isRamadan = prayerTime.is_ramadan === 1;

              const dayNames = [
                "Sun",
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
              ];
              const dayAbbr = dayNames[date.getDay()];

              const baseRowStyle: ViewStyle = {
                flexDirection: "row",
                borderBottomWidth: 1,
                borderBottomColor: "rgba(0,0,0,0.1)",
                paddingVertical: 8,
                minHeight: 40,
              };

              let combinedRowStyle: ViewStyle = { ...baseRowStyle };
              let textColor = colors.text;

              if (isToday) {
                combinedRowStyle = {
                  ...baseRowStyle,
                  backgroundColor: colors.primary,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 4,
                };
                textColor = "#fff";
              } else if (isMonday) {
                combinedRowStyle = {
                  ...baseRowStyle,
                  backgroundColor: "#FFF3E0",
                  borderLeftWidth: 3,
                  borderLeftColor: "#FF9800",
                };
                textColor = "#E65100";
              } else if (isRamadan) {
                combinedRowStyle = {
                  ...baseRowStyle,
                  backgroundColor: "#FFF8E1",
                  borderRightWidth: 3,
                  borderRightColor: "#F9A825",
                };
              }

              return (
                <View
                  key={`${prayerTime.d_date}-${index}`}
                  style={combinedRowStyle}
                >
                  <View style={[styles.monthlyCell, styles.dateCell]}>
                    <ThemedText
                      style={[
                        styles.monthlyCellText,
                        {
                          color: textColor,
                          fontWeight: isToday || isMonday ? "800" : "600",
                        },
                      ]}
                    >
                      {date.getDate()}
                      {isRamadan && (
                        <ThemedText style={styles.ramadanIcon}> 🌙</ThemedText>
                      )}
                    </ThemedText>
                  </View>
                  <View style={[styles.monthlyCell, styles.dayCell]}>
                    <ThemedText
                      style={[
                        styles.monthlyCellText,
                        {
                          color: textColor,
                          fontWeight: isToday || isMonday ? "800" : "600",
                        },
                      ]}
                    >
                      {dayAbbr}
                    </ThemedText>
                  </View>
                  <View style={[styles.monthlyCell, styles.timeCell]}>
                    <ThemedText
                      style={[styles.monthlyTimeText, { color: textColor }]}
                    >
                      {formatTimeForDisplay(prayerTime.fajr_begins)}
                    </ThemedText>
                    {prayerTime.fajr_jamah && (
                      <ThemedText
                        style={[styles.monthlyJamahText, { color: textColor }]}
                      >
                        J: {formatTimeForDisplay(prayerTime.fajr_jamah)}
                      </ThemedText>
                    )}
                  </View>
                  <View style={[styles.monthlyCell, styles.timeCell]}>
                    <ThemedText
                      style={[styles.monthlyTimeText, { color: textColor }]}
                    >
                      {formatTimeForDisplay(prayerTime.sunrise)}
                    </ThemedText>
                  </View>
                  <View style={[styles.monthlyCell, styles.timeCell]}>
                    <ThemedText
                      style={[styles.monthlyTimeText, { color: textColor }]}
                    >
                      {formatTimeForDisplay(prayerTime.zuhr_begins)}
                    </ThemedText>
                    {prayerTime.zuhr_jamah && (
                      <ThemedText
                        style={[styles.monthlyJamahText, { color: textColor }]}
                      >
                        J: {formatTimeForDisplay(prayerTime.zuhr_jamah)}
                      </ThemedText>
                    )}
                  </View>
                  <View style={[styles.monthlyCell, styles.timeCell]}>
                    <ThemedText
                      style={[styles.monthlyTimeText, { color: textColor }]}
                    >
                      {formatTimeForDisplay(prayerTime.asr_mithl_1)}
                    </ThemedText>
                    {prayerTime.asr_jamah && (
                      <ThemedText
                        style={[styles.monthlyJamahText, { color: textColor }]}
                      >
                        J: {formatTimeForDisplay(prayerTime.asr_jamah)}
                      </ThemedText>
                    )}
                  </View>
                  <View style={[styles.monthlyCell, styles.timeCell]}>
                    <ThemedText
                      style={[styles.monthlyTimeText, { color: textColor }]}
                    >
                      {formatTimeForDisplay(prayerTime.maghrib_begins)}
                    </ThemedText>
                    {prayerTime.maghrib_jamah && (
                      <ThemedText
                        style={[styles.monthlyJamahText, { color: textColor }]}
                      >
                        J: {formatTimeForDisplay(prayerTime.maghrib_jamah)}
                      </ThemedText>
                    )}
                  </View>
                  <View style={[styles.monthlyCell, styles.timeCell]}>
                    <ThemedText
                      style={[styles.monthlyTimeText, { color: textColor }]}
                    >
                      {formatTimeForDisplay(prayerTime.isha_begins)}
                    </ThemedText>
                    {prayerTime.isha_jamah && (
                      <ThemedText
                        style={[styles.monthlyJamahText, { color: textColor }]}
                      >
                        J: {formatTimeForDisplay(prayerTime.isha_jamah)}
                      </ThemedText>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.monthlyLegend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: colors.primary }]}
            />
            <ThemedText style={[styles.legendText, { color: colors.text }]}>
              Today
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: "#FFF3E0" }]}
            />
            <ThemedText style={[styles.legendText, { color: colors.text }]}>
              Monday
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#FFF8E1" }]}>
              <ThemedText style={styles.legendRamadanIcon}>🌙</ThemedText>
            </View>
            <ThemedText style={[styles.legendText, { color: colors.text }]}>
              Ramadan
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <ThemedText
              style={[styles.legendNote, { color: `${colors.text}80` }]}
            >
              J: Jamah times
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    );
  };

  const renderDailyView = () => {
    console.log(
      "📅 Rendering daily view, todaysPrayers:",
      todaysPrayers ? "EXISTS" : "NULL"
    );

    if (!todaysPrayers) {
      return (
        <ThemedView
          style={[styles.noDataCard, { backgroundColor: colors.surface }]}
        >
          <View style={styles.noDataIconContainer}>
            <IconSymbol name="calendar" size={48} color={colors.primary} />
          </View>
          <ThemedText type="subtitle" style={styles.noDataTitle}>
            No Prayer Times for Today
          </ThemedText>
          <ThemedText style={styles.noDataText}>
            Prayer times for today ({today}) are not available.
            {"\n"}Total prayer times available: {prayerTimes.length}
          </ThemedText>
        </ThemedView>
      );
    }

    const prayers = extractPrayersFromTime(todaysPrayers);

    return (
      <View>
        {nextPrayer && (
          <LinearGradient
            colors={["#1B5E20", "#2E7D32"]}
            style={styles.nextPrayerCard}
          >
            <View style={styles.nextPrayerContent}>
              <Animated.View
                style={[
                  styles.nextPrayerIcon,
                  {
                    transform: [
                      { scale: currentPrayer === nextPrayer ? pulseAnim : 1 },
                    ],
                  },
                ]}
              >
                <IconSymbol name="bell.fill" size={32} color="#fff" />
              </Animated.View>
              <View style={styles.nextPrayerTextContainer}>
                <ThemedText style={styles.nextPrayerLabel}>
                  Next Prayer
                </ThemedText>
                <ThemedText type="title" style={styles.nextPrayerName}>
                  {nextPrayer.charAt(0).toUpperCase() + nextPrayer.slice(1)}
                </ThemedText>
                <ThemedText style={styles.timeUntilText}>
                  in {timeUntilNext}
                </ThemedText>
              </View>
            </View>
          </LinearGradient>
        )}

        <ThemedView
          style={[styles.prayersList, { backgroundColor: colors.surface }]}
        >
          <View style={styles.sectionHeader}>
            <IconSymbol name="clock" size={20} color={colors.primary} />
            <ThemedText
              type="subtitle"
              style={[styles.sectionTitle, { color: colors.primary }]}
            >
              Today's Prayer Times
            </ThemedText>
          </View>

          {prayers.map((prayer, prayerIndex) => (
            <PrayerTimeCard
              key={prayerIndex}
              prayer={prayer}
              isActive={
                currentPrayer === prayer.name.toLowerCase() ||
                (currentPrayer === "sunrise" && prayer.name === "Sunrise")
              }
              isNext={
                nextPrayer === prayer.name.toLowerCase() ||
                (nextPrayer === "sunrise" && prayer.name === "Sunrise")
              }
            />
          ))}
        </ThemedView>

        {todaysPrayers.is_ramadan === 1 && (
          <LinearGradient
            colors={["#F9A825", "#FFA726"]}
            style={styles.ramadanBadge}
          >
            <View style={styles.ramadanContent}>
              <ThemedText style={styles.ramadanIcon}>🌙</ThemedText>
              <ThemedText style={styles.ramadanText}>Ramadan Kareem</ThemedText>
            </View>
          </LinearGradient>
        )}
      </View>
    );
  };

  if (!Array.isArray(prayerTimes) || prayerTimes.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        />
        <LinearGradient
          colors={
            colorScheme === "dark"
              ? ["#1B5E20", "#2E7D32", "#388E3C"]
              : ["#E8F5E9", "#C8E6C9", "#A5D6A7"]
          }
          style={styles.gradientHeader}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require("@/assets/logos/mosqueLogo.png")}
              style={styles.mosqueLogo}
              contentFit="contain"
            />
          </View>
          <View style={styles.headerContent}>
            <ThemedText style={styles.greetingText}>{getGreeting()}</ThemedText>
            <ThemedText style={styles.mosqueNameEnhanced}>
              Masjid Abubakr Siddique
            </ThemedText>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <ThemedText style={styles.currentTimeText}>
                {formatCurrentTime()}
              </ThemedText>
              <ThemedText style={styles.dateTextEnhanced}>
                {formatCurrentDate()}
              </ThemedText>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
          }
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            <ThemedView style={styles.noDataCardEnhanced}>
              <View style={styles.noDataIconContainer}>
                <IconSymbol name="calendar" size={48} color={colors.primary} />
              </View>
              <ThemedText type="subtitle" style={styles.noDataTitle}>
                Prayer Times Not Available
              </ThemedText>
              <ThemedText style={styles.noDataText}>
                Prayer times haven't been uploaded yet. Please contact the
                mosque administration.
              </ThemedText>
              <TouchableOpacity
                style={styles.refreshButtonEnhanced}
                onPress={refreshData}
                disabled={isLoading}
              >
                <IconSymbol name="arrow.clockwise" size={20} color="#fff" />
                <ThemedText style={styles.refreshButtonText}>
                  {isLoading ? "Checking..." : "Refresh"}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      <LinearGradient
        colors={
          colorScheme === "dark"
            ? ["#1B5E20", "#2E7D32", "#388E3C"]
            : ["#E8F5E9", "#C8E6C9", "#A5D6A7"]
        }
        style={styles.gradientHeader}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/logos/mosqueLogo.png")}
            style={styles.mosqueLogo}
            contentFit="contain"
          />
        </View>

        <View style={styles.headerContent}>
          <ThemedText style={styles.greetingText}>{getGreeting()}</ThemedText>
          <ThemedText style={styles.mosqueNameEnhanced}>
            Masjid Abubakr Siddique
          </ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ThemedText style={styles.currentTimeText}>
              {formatCurrentTime()}
            </ThemedText>
            <ThemedText style={styles.dateTextEnhanced}>
              {formatCurrentDate()}
            </ThemedText>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handlePrint}
            style={styles.printButton}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <IconSymbol name="printer" size={20} color="#fff" />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <IconSymbol name="square.and.arrow.up" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ThemedView
        style={[styles.toggleContainer, { backgroundColor: colors.surface }]}
      >
        <View style={styles.toggleButtons}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === "daily" && [
                styles.toggleButtonActive,
                { backgroundColor: colors.primary },
              ],
              { borderColor: colors.primary },
            ]}
            onPress={() => setViewMode("daily")}
          >
            <IconSymbol
              name="clock"
              size={18}
              color={viewMode === "daily" ? "#fff" : colors.primary}
            />
            <ThemedText
              style={[
                styles.toggleButtonText,
                { color: viewMode === "daily" ? "#fff" : colors.primary },
              ]}
            >
              Daily
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === "monthly" && [
                styles.toggleButtonActive,
                { backgroundColor: colors.primary },
              ],
              { borderColor: colors.primary },
            ]}
            onPress={() => setViewMode("monthly")}
          >
            <IconSymbol
              name="calendar"
              size={18}
              color={viewMode === "monthly" ? "#fff" : colors.primary}
            />
            <ThemedText
              style={[
                styles.toggleButtonText,
                { color: viewMode === "monthly" ? "#fff" : colors.primary },
              ]}
            >
              Monthly
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>

      <ScrollView
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View
            style={[
              styles.loadingContainer,
              { backgroundColor: colors.surface },
            ]}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText style={[styles.loadingText, { color: colors.text }]}>
              Loading prayer times...
            </ThemedText>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {viewMode === "daily"
              ? renderDailyView()
              : renderMonthlyTimetable()}
            <View style={styles.bottomSpacing} />
          </Animated.View>
        )}
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
    paddingTop: Platform.OS === "ios" ? 44 : StatusBar.currentHeight || 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    minHeight: Platform.OS === "ios" ? 100 : 80,
  },
  logoContainer: {
    marginRight: 12,
  },
  mosqueLogo: {
    width: 48,
    height: 48,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
  },
  headerContent: {
    flex: 1,
    justifyContent: "center",
  },
  greetingText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    marginBottom: 2,
  },
  mosqueNameEnhanced: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  currentTimeText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  dateTextEnhanced: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  headerActions: {
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  printButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  shareButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleContainer: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  toggleButtons: {
    flexDirection: "row",
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  toggleButtonActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  scrollContent: {
    flex: 1,
  },
  nextPrayerCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  nextPrayerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  nextPrayerIcon: {
    marginRight: 16,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
  },
  nextPrayerTextContainer: {
    flex: 1,
  },
  nextPrayerLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  nextPrayerName: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  timeUntilText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  prayersList: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  ramadanBadge: {
    margin: 20,
    marginTop: 0,
    borderRadius: 20,
    shadowColor: "#F9A825",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  ramadanContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  ramadanIcon: {
    fontSize: 28,
  },
  ramadanText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  monthlyContainer: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  monthlyHeader: {
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  monthlyTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  monthlyScrollView: {
    flex: 1,
  },
  monthlyTable: {
    flex: 1,
    minWidth: width - 32,
  },
  monthlyHeaderRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "rgba(255,255,255,0.3)",
  },
  monthlyHeaderText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  monthlyCell: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 30,
  },
  dateCell: {
    width: 40,
    minWidth: 40,
  },
  dayCell: {
    width: 40,
    minWidth: 40,
  },
  timeCell: {
    width: 70,
    minWidth: 70,
  },
  monthlyCellText: {
    fontSize: 13,
    textAlign: "center",
  },
  monthlyTimeText: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 2,
  },
  monthlyJamahText: {
    fontSize: 9,
    fontWeight: "500",
    textAlign: "center",
    opacity: 0.8,
  },
  monthlyLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendColor: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  legendRamadanIcon: {
    fontSize: 7,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "500",
  },
  legendNote: {
    fontSize: 10,
    fontStyle: "italic",
  },
  noDataCard: {
    margin: 16,
    padding: 40,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  noDataCardEnhanced: {
    margin: 20,
    padding: 40,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(27, 94, 32, 0.1)",
  },
  noDataIconContainer: {
    padding: 24,
    backgroundColor: "rgba(27, 94, 32, 0.1)",
    borderRadius: 32,
    marginBottom: 24,
  },
  noDataTitle: {
    fontSize: 22,
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  noDataText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  refreshButtonEnhanced: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  loadingContainer: {
    margin: 20,
    padding: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  bottomSpacing: {
    height: Platform.OS === "ios" ? 100 : 80,
  },
});

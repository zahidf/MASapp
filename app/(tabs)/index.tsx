import { BlurView } from "expo-blur";
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

import { IconSymbol } from "@/components/ui/IconSymbol";
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
          toValue: 1.02,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
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
        return "sunrise";
      case "sunrise":
        return "sun.max";
      case "zuhr":
        return "sun.max.fill";
      case "asr":
        return "sun.min";
      case "maghrib":
        return "sunset";
      case "isha":
        return "moon.stars";
      default:
        return "clock";
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

  // Enhanced prayer card render function with better visual hierarchy
  const renderPrayerCard = (
    name: string,
    time: string,
    jamah?: string,
    isActive = false,
    isNext = false
  ) => {
    const cardOpacity = isActive ? 1 : isNext ? 0.98 : 0.95;
    const cardScale = isActive ? pulseAnim : 1;

    return (
      <Animated.View
        key={name}
        style={[
          {
            opacity: cardOpacity,
            transform: [{ scale: cardScale }],
          },
          styles.prayerCardWrapper,
        ]}
      >
        <BlurView
          intensity={isActive ? 100 : isNext ? 90 : 80}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={[
            styles.prayerCard,
            isActive && styles.activePrayerCard,
            isNext && styles.nextPrayerCard,
            {
              backgroundColor: isActive
                ? colors.primary + "20"
                : isNext
                ? colors.primary + "12"
                : colors.surface + "95",
              borderColor: isActive
                ? colors.primary
                : isNext
                ? colors.primary + "60"
                : colorScheme === "dark"
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          <View style={styles.prayerCardContent}>
            {/* Prayer Icon and Name */}
            <View style={styles.prayerHeaderRow}>
              <View
                style={[
                  styles.prayerIconContainer,
                  {
                    backgroundColor: isActive
                      ? colors.primary + "25"
                      : isNext
                      ? colors.primary + "15"
                      : colorScheme === "dark"
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.05)",
                  },
                ]}
              >
                <IconSymbol
                  name={getPrayerIcon(name) as any}
                  size={22}
                  color={
                    isActive
                      ? colors.primary
                      : isNext
                      ? colors.primary
                      : colors.text + "85"
                  }
                />
              </View>

              <View style={styles.prayerNameContainer}>
                <Text
                  style={[
                    styles.prayerName,
                    {
                      color: isActive ? colors.primary : colors.text,
                      fontWeight: isActive || isNext ? "700" : "600",
                    },
                  ]}
                >
                  {name}
                </Text>
                {(isActive || isNext) && (
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: isActive
                          ? colors.primary
                          : colors.primary + "25",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: isActive ? "#fff" : colors.primary },
                      ]}
                    >
                      {isActive ? "NOW" : getCountdownToNext() || "NEXT"}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Time Information */}
            <View style={styles.timeContainer}>
              <View style={styles.timeSection}>
                <Text style={[styles.timeLabel, { color: colors.text + "65" }]}>
                  BEGINS
                </Text>
                <Text
                  style={[
                    styles.timeValue,
                    {
                      color: isActive ? colors.primary : colors.text,
                      fontWeight: isActive ? "700" : "600",
                    },
                  ]}
                >
                  {formatTime(time)}
                </Text>
              </View>

              {jamah && jamah.trim() !== "" && name !== "Sunrise" && (
                <>
                  <View
                    style={[
                      styles.timeDivider,
                      { backgroundColor: colors.text + "12" },
                    ]}
                  />
                  <View style={styles.timeSection}>
                    <Text
                      style={[styles.timeLabel, { color: colors.text + "65" }]}
                    >
                      JAMAH
                    </Text>
                    <Text
                      style={[
                        styles.timeValue,
                        {
                          color: isActive ? colors.primary : colors.text,
                          fontWeight: isActive ? "700" : "600",
                        },
                      ]}
                    >
                      {formatTime(jamah)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </BlurView>
      </Animated.View>
    );
  };

  if (!Array.isArray(prayerTimes) || prayerTimes.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        />

        {/* Enhanced Header with Logo */}
        <BlurView
          intensity={80}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerMainRow}>
              <View style={styles.headerTextSection}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  Today
                </Text>
                <Text
                  style={[styles.headerSubtitle, { color: colors.text + "80" }]}
                >
                  {formatCurrentDate()}
                </Text>
              </View>

              {/* Mosque Logo */}
              <View style={styles.logoContainer}>
                {logoSvg ? (
                  <SvgXml xml={logoSvg} width={32} height={32} />
                ) : (
                  <IconSymbol
                    name="building.2"
                    size={28}
                    color={colors.text + "60"}
                  />
                )}
              </View>
            </View>
          </View>
        </BlurView>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.noDataContainer}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
          }
        >
          <View
            style={[styles.noDataCard, { backgroundColor: colors.surface }]}
          >
            <IconSymbol name="calendar" size={48} color={colors.text + "40"} />
            <Text style={[styles.noDataTitle, { color: colors.text }]}>
              Prayer Times Not Available
            </Text>
            <Text style={[styles.noDataText, { color: colors.text + "80" }]}>
              Prayer times haven't been uploaded yet. Please contact the mosque
              administration.
            </Text>
            <TouchableOpacity
              style={[
                styles.refreshButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={refreshData}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.refreshButtonText}>
                {isLoading ? "Checking..." : "Refresh"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      {/* Enhanced Header with Logo and Export */}
      <BlurView
        intensity={80}
        tint={colorScheme === "dark" ? "dark" : "light"}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerMainRow}>
            <View style={styles.headerTextSection}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Today
              </Text>
              <Text
                style={[styles.headerSubtitle, { color: colors.text + "80" }]}
              >
                {formatCurrentDate()}
              </Text>
            </View>

            <View style={styles.headerActions}>
              {/* Mosque Logo */}
              <View style={styles.logoContainer}>
                {logoSvg ? (
                  <SvgXml xml={logoSvg} width={32} height={32} />
                ) : (
                  <IconSymbol
                    name="building.2"
                    size={28}
                    color={colors.text + "60"}
                  />
                )}
              </View>

              {/* Export Button */}
              <TouchableOpacity
                style={[
                  styles.headerButton,
                  { backgroundColor: colors.primary + "15" },
                ]}
                onPress={handlePrint}
                disabled={isExporting}
                activeOpacity={0.7}
              >
                <IconSymbol
                  name="square.and.arrow.up"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Next Prayer Summary */}
          {nextPrayer && todaysPrayers && (
            <View
              style={[
                styles.nextPrayerSummary,
                { backgroundColor: colors.primary + "12" },
              ]}
            >
              <View style={styles.nextPrayerContent}>
                <Text
                  style={[
                    styles.nextPrayerLabel,
                    { color: colors.primary + "85" },
                  ]}
                >
                  NEXT PRAYER
                </Text>
                <Text
                  style={[styles.nextPrayerName, { color: colors.primary }]}
                >
                  {nextPrayer.charAt(0).toUpperCase() + nextPrayer.slice(1)}
                </Text>
              </View>
              <Text style={[styles.nextPrayerTime, { color: colors.primary }]}>
                {getCountdownToNext() || "Soon"}
              </Text>
            </View>
          )}
        </View>
      </BlurView>

      {/* Main Content */}
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
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {viewMode === "daily" ? (
              <View style={styles.dailyView}>
                {/* Prayer Cards */}
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
                      <Text
                        style={[
                          styles.noDataMessage,
                          { color: colors.text + "80" },
                        ]}
                      >
                        No prayer times available for today
                      </Text>
                    </View>
                  )}
                </View>

                {/* Enhanced Mosque Info Card */}
                <BlurView
                  intensity={60}
                  tint={colorScheme === "dark" ? "dark" : "light"}
                  style={[
                    styles.mosqueInfoCard,
                    {
                      backgroundColor: colors.surface + "90",
                      borderColor:
                        colorScheme === "dark"
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                    },
                  ]}
                >
                  <View style={styles.mosqueLogoContainer}>
                    {logoSvg ? (
                      <SvgXml xml={logoSvg} width={24} height={24} />
                    ) : (
                      <IconSymbol
                        name="building.2"
                        size={20}
                        color={colors.text + "60"}
                      />
                    )}
                  </View>
                  <View style={styles.mosqueInfoContent}>
                    <Text
                      style={[styles.mosqueInfoTitle, { color: colors.text }]}
                    >
                      Masjid Abubakr Siddique
                    </Text>
                    <Text
                      style={[
                        styles.mosqueInfoSubtitle,
                        { color: colors.text + "60" },
                      ]}
                    >
                      Birmingham, UK
                    </Text>
                  </View>
                </BlurView>
              </View>
            ) : (
              // Monthly view - keeping your existing implementation
              <View style={styles.monthlyView}>
                {/* ... your existing monthly view code ... */}
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// Enhanced styles with better visual hierarchy
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Enhanced header with logo support
  header: {
    paddingTop: Platform.OS === "ios" ? 50 : StatusBar.currentHeight || 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },

  headerContent: {
    gap: 12,
  },

  headerMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTextSection: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: 0.37,
    marginBottom: 2,
  },

  headerSubtitle: {
    fontSize: 15,
    fontWeight: "400",
    letterSpacing: -0.4,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  logoContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  nextPrayerSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.04)",
  },

  nextPrayerContent: {
    flex: 1,
  },

  nextPrayerLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },

  nextPrayerName: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },

  nextPrayerTime: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.4,
  },

  // Main content
  scrollContent: {
    flex: 1,
  },

  scrollContentContainer: {
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
  },

  dailyView: {
    padding: 16,
  },

  prayersList: {
    gap: 16, // Increased gap for better separation
  },

  // Enhanced prayer cards with better visual hierarchy
  prayerCardWrapper: {
    // Wrapper for enhanced shadow effects
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  prayerCard: {
    borderRadius: 18, // Slightly larger radius for modern look
    overflow: "hidden",
    borderWidth: 1.5,
  },

  activePrayerCard: {
    borderWidth: 2.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },

  nextPrayerCard: {
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },

  prayerCardContent: {
    padding: 18, // Increased padding for better breathing room
  },

  prayerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14, // Increased margin
  },

  prayerIconContainer: {
    width: 40, // Slightly larger
    height: 40,
    borderRadius: 14, // More rounded
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14, // Increased margin
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.04)",
  },

  prayerNameContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  prayerName: {
    fontSize: 18, // Slightly larger
    letterSpacing: -0.4,
  },

  statusBadge: {
    paddingHorizontal: 10, // Increased padding
    paddingVertical: 5,
    borderRadius: 10, // More rounded
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.04)",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Enhanced time information layout
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 4,
  },

  timeSection: {
    flex: 1,
    alignItems: "center",
  },

  timeDivider: {
    width: 1.5, // Slightly thicker
    height: 44, // Taller
    marginHorizontal: 18, // More spacing
    borderRadius: 1,
  },

  timeLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 5, // Increased margin
  },

  timeValue: {
    fontSize: 24, // Larger for better readability
    letterSpacing: -0.4,
  },

  // Enhanced mosque info card
  mosqueInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 28, // Increased margin
    padding: 18, // Increased padding
    borderRadius: 16, // More rounded
    borderWidth: 1,
    gap: 14, // Increased gap
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  mosqueLogoContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.02)",
  },

  mosqueInfoContent: {
    flex: 1,
  },

  mosqueInfoTitle: {
    fontSize: 16, // Slightly larger
    fontWeight: "600",
    letterSpacing: -0.4,
    marginBottom: 3, // Increased margin
  },

  mosqueInfoSubtitle: {
    fontSize: 14, // Slightly larger
    letterSpacing: -0.08,
  },

  // Loading and no data states
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },

  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  noDataCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    maxWidth: 320,
  },

  noDataSection: {
    padding: 60,
    alignItems: "center",
  },

  noDataIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  noDataTitle: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: "center",
  },

  noDataText: {
    fontSize: 15,
    letterSpacing: -0.4,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },

  noDataMessage: {
    fontSize: 15,
    letterSpacing: -0.4,
    textAlign: "center",
  },

  refreshButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },

  refreshButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },

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

  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
});

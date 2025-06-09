import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
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
  getCurrentPrayerAndNext,
  getTimeUntilNext,
  getTodayString,
} from "@/utils/dateHelpers";

const { width, height } = Dimensions.get("window");

export default function TodayScreen() {
  const colorScheme = useColorScheme();
  const { prayerTimes, refreshData, isLoading } = usePrayerTimes();
  const [todaysPrayers, setTodaysPrayers] = useState<PrayerTime | null>(null);
  const [currentPrayer, setCurrentPrayer] = useState<PrayerName | null>(null);
  const [nextPrayer, setNextPrayer] = useState<PrayerName | null>(null);
  const [timeUntilNext, setTimeUntilNext] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  // Animations
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for current prayer
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

  // Update current time every minute
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

      const today = getTodayString();
      const todayData = prayerTimes.find((pt) => pt && pt.d_date === today);

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
          console.error("Error updating prayer status:", error);
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
  }, [prayerTimes]);

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

      await Share.share({
        message,
        title: "Prayer Times",
      });
    } catch (error) {
      console.error("Error sharing:", error);
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

  // Enhanced loading/no data states
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
                <IconSymbol
                  name="calendar"
                  size={48}
                  color={Colors[colorScheme ?? "light"].primary}
                />
              </View>
              <ThemedText type="subtitle" style={styles.noDataTitle}>
                Prayer Times Not Available
              </ThemedText>
              <ThemedText style={styles.noDataText}>
                Prayer times haven't been uploaded yet. Please contact the
                mosque administration to upload the prayer timetable.
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

  if (!todaysPrayers) {
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
                <IconSymbol
                  name="calendar"
                  size={48}
                  color={Colors[colorScheme ?? "light"].primary}
                />
              </View>
              <ThemedText type="subtitle" style={styles.noDataTitle}>
                No Prayer Times for Today
              </ThemedText>
              <ThemedText style={styles.noDataText}>
                Prayer times for today are not available. The timetable may need
                to be updated.
              </ThemedText>
            </ThemedView>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  const prayers = extractPrayersFromTime(todaysPrayers);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      {/* Enhanced Header with Better Animations */}
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

        <TouchableOpacity
          onPress={handleShare}
          style={styles.shareButtonEnhanced}
        >
          <IconSymbol name="square.and.arrow.up" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Enhanced Next Prayer Card */}
          {nextPrayer && (
            <LinearGradient
              colors={["#1B5E20", "#2E7D32"]}
              style={styles.nextPrayerCardEnhanced}
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
                  <ThemedText style={styles.timeUntilEnhanced}>
                    in {timeUntilNext}
                  </ThemedText>
                </View>
              </View>
            </LinearGradient>
          )}

          {/* Enhanced Prayer Times List */}
          <ThemedView style={styles.prayersListEnhanced}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                name="clock"
                size={20}
                color={Colors[colorScheme ?? "light"].primary}
              />
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Today's Prayer Times
              </ThemedText>
            </View>

            {prayers.map((prayer, index) => (
              <PrayerTimeCard
                key={index}
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

          {/* Enhanced Ramadan Badge */}
          {todaysPrayers.is_ramadan === 1 && (
            <LinearGradient
              colors={["#F9A825", "#FFA726"]}
              style={styles.ramadanBadgeEnhanced}
            >
              <View style={styles.ramadanContent}>
                <ThemedText style={styles.ramadanIcon}>🌙</ThemedText>
                <ThemedText style={styles.ramadanTextEnhanced}>
                  Ramadan Kareem
                </ThemedText>
              </View>
            </LinearGradient>
          )}

          {/* Enhanced Quick Actions */}
          <ThemedView style={styles.quickActionsContainer}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                name="star"
                size={20}
                color={Colors[colorScheme ?? "light"].primary}
              />
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Quick Actions
              </ThemedText>
            </View>

            <View style={styles.quickActionsGrid}>
              <TouchableOpacity style={styles.quickActionButton}>
                <IconSymbol
                  name="calendar"
                  size={24}
                  color={Colors[colorScheme ?? "light"].primary}
                />
                <ThemedText style={styles.quickActionText}>Calendar</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={handleShare}
              >
                <IconSymbol
                  name="square.and.arrow.up"
                  size={24}
                  color={Colors[colorScheme ?? "light"].primary}
                />
                <ThemedText style={styles.quickActionText}>Share</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionButton}>
                <IconSymbol
                  name="location"
                  size={24}
                  color={Colors[colorScheme ?? "light"].primary}
                />
                <ThemedText style={styles.quickActionText}>Location</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionButton}>
                <IconSymbol
                  name="bell"
                  size={24}
                  color={Colors[colorScheme ?? "light"].primary}
                />
                <ThemedText style={styles.quickActionText}>
                  Reminders
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </Animated.View>
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  shareButtonEnhanced: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    marginLeft: 8,
  },
  scrollContent: {
    flex: 1,
  },
  nextPrayerCardEnhanced: {
    margin: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
  timeUntilEnhanced: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  prayersListEnhanced: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    color: Colors.light.primary,
    letterSpacing: 0.3,
  },
  ramadanBadgeEnhanced: {
    margin: 20,
    marginTop: 0,
    borderRadius: 20,
    shadowColor: "#F9A825",
    shadowOffset: {
      width: 0,
      height: 6,
    },
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
  ramadanTextEnhanced: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  quickActionsContainer: {
    margin: 20,
    marginTop: 0,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  quickActionButton: {
    width: (width - 80) / 2 - 8,
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: "rgba(27, 94, 32, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(27, 94, 32, 0.15)",
    shadowColor: "#1B5E20",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.primary,
    marginTop: 12,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  noDataCardEnhanced: {
    margin: 20,
    padding: 40,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
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
    shadowOffset: {
      width: 0,
      height: 6,
    },
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
  bottomSpacing: {
    height: Platform.OS === "ios" ? 100 : 80,
  },
});

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
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

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateTodaysPrayers = () => {
      console.log(
        "updateTodaysPrayers called, prayerTimes length:",
        prayerTimes?.length
      );

      if (!Array.isArray(prayerTimes) || prayerTimes.length === 0) {
        console.log("No prayer times available");
        setTodaysPrayers(null);
        return;
      }

      const today = getTodayString();
      console.log("Looking for prayer times for:", today);

      const todayData = prayerTimes.find((pt) => pt && pt.d_date === today);
      console.log("Found today data:", !!todayData, todayData?.d_date);

      if (todayData && typeof todayData === "object") {
        setTodaysPrayers(todayData);

        try {
          const { current, next } = getCurrentPrayerAndNext(todayData);
          console.log("Current prayer:", current, "Next prayer:", next);

          setCurrentPrayer(current);
          setNextPrayer(next);

          // Get the time property name for the next prayer
          const nextPrayerTimeProperty = getNextPrayerTimeProperty(next);
          console.log("Next prayer time property:", nextPrayerTimeProperty);

          if (nextPrayerTimeProperty && todayData[nextPrayerTimeProperty]) {
            const nextPrayerTime = todayData[nextPrayerTimeProperty] as string;
            console.log("Next prayer time:", nextPrayerTime);

            const timeUntil = getTimeUntilNext(nextPrayerTime);
            setTimeUntilNext(timeUntil);
          } else {
            console.warn(
              "Could not find time for next prayer:",
              next,
              nextPrayerTimeProperty
            );
            setTimeUntilNext("Unknown");
          }
        } catch (error) {
          console.error("Error updating prayer status:", error);
          setCurrentPrayer(null);
          setNextPrayer("fajr");
          setTimeUntilNext("Unknown");
        }
      } else {
        console.log("No prayer data found for today");
        setTodaysPrayers(null);
      }
    };

    updateTodaysPrayers();
    const interval = setInterval(updateTodaysPrayers, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [prayerTimes]);

  // Helper function to get the correct property name for prayer times
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
        console.warn("Unknown prayer name:", prayerName);
        return null;
    }
  };

  const handleShare = async () => {
    if (!todaysPrayers) {
      console.warn("No prayer times to share");
      return;
    }

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

  // Show "no data" state when prayer times haven't been uploaded yet
  if (!Array.isArray(prayerTimes) || prayerTimes.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        />
        <LinearGradient
          colors={
            colorScheme === "dark"
              ? ["#FFFF00", "#2E7D32", "#388E3C"]
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
            <ThemedText type="title" style={styles.mosqueNameEnhanced}>
              Masjid Abubakr Siddique
            </ThemedText>
            <ThemedText style={styles.currentTimeText}>
              {formatCurrentTime()}
            </ThemedText>
            <ThemedText style={styles.dateTextEnhanced}>
              {formatCurrentDate()}
            </ThemedText>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
          }
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.noDataCardEnhanced}>
            <View style={styles.noDataIconContainer}>
              <IconSymbol
                name="calendar"
                size={48}
                color={Colors[colorScheme ?? "light"].text}
              />
            </View>
            <ThemedText type="subtitle" style={styles.noDataTitle}>
              Prayer Times Not Available
            </ThemedText>
            <ThemedText style={styles.noDataText}>
              Prayer times haven't been uploaded yet. Please contact the mosque
              administration to upload the prayer timetable.
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
        </ScrollView>
      </View>
    );
  }

  // Show "no data for today" if we have prayer times but not for today
  if (!todaysPrayers) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        />
        <LinearGradient
          colors={
            colorScheme === "dark"
              ? ["#FFFF00", "#2E7D32", "#388E3C"]
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
            <ThemedText type="title" style={styles.mosqueNameEnhanced}>
              Masjid Abubakr Siddique
            </ThemedText>
            <ThemedText style={styles.currentTimeText}>
              {formatCurrentTime()}
            </ThemedText>
            <ThemedText style={styles.dateTextEnhanced}>
              {formatCurrentDate()}
            </ThemedText>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
          }
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.noDataCardEnhanced}>
            <View style={styles.noDataIconContainer}>
              <IconSymbol
                name="calendar"
                size={48}
                color={Colors[colorScheme ?? "light"].text}
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

      {/* Enhanced Header with Gradient and Logo */}
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
          <ThemedText type="title" style={styles.mosqueNameEnhanced}>
            Masjid Abubakr Siddique
          </ThemedText>
          <ThemedText style={styles.currentTimeText}>
            {formatCurrentTime()}
          </ThemedText>
          <ThemedText style={styles.dateTextEnhanced}>
            {formatCurrentDate()}
          </ThemedText>
        </View>

        <TouchableOpacity
          onPress={handleShare}
          style={styles.shareButtonEnhanced}
        >
          <IconSymbol name="square.and.arrow.up" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Next Prayer Card */}
        {nextPrayer && (
          <LinearGradient
            colors={["#1B5E20", "#2E7D32"]}
            style={styles.nextPrayerCardEnhanced}
          >
            <View style={styles.nextPrayerContent}>
              <View style={styles.nextPrayerIcon}>
                <IconSymbol name="bell" size={32} color="#fff" />
              </View>
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

        {/* Quick Actions */}
        <ThemedView style={styles.quickActionsContainer}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Quick Actions
          </ThemedText>

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
              <ThemedText style={styles.quickActionText}>Reminders</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>

        {/* Bottom Spacing */}
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
    paddingTop: StatusBar.currentHeight || 44,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  logoContainer: {
    marginRight: 16,
  },
  mosqueLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerContent: {
    flex: 1,
  },
  mosqueNameEnhanced: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  currentTimeText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 2,
  },
  dateTextEnhanced: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  shareButtonEnhanced: {
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
  },
  scrollContent: {
    flex: 1,
  },
  nextPrayerCardEnhanced: {
    margin: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  nextPrayerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
  },
  nextPrayerIcon: {
    marginRight: 20,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
  },
  nextPrayerTextContainer: {
    flex: 1,
  },
  nextPrayerLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  nextPrayerName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  timeUntilEnhanced: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  prayersListEnhanced: {
    margin: 20,
    marginTop: 0,
    borderRadius: 20,
    padding: 20,
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFF00",
  },
  ramadanBadgeEnhanced: {
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  ramadanContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  ramadanIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  ramadanTextEnhanced: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  quickActionsContainer: {
    margin: 20,
    marginTop: 0,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 12,
  },
  quickActionButton: {
    width: (width - 80) / 4,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: "rgba(27, 94, 32, 0.05)",
    borderRadius: 12,
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFF00",
    marginTop: 8,
    textAlign: "center",
  },
  noDataCardEnhanced: {
    margin: 20,
    padding: 32,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  noDataIconContainer: {
    padding: 20,
    backgroundColor: "rgba(27, 94, 32, 0.1)",
    borderRadius: 24,
    marginBottom: 20,
  },
  noDataTitle: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "700",
  },
  noDataText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  refreshButtonEnhanced: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFF00",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  bottomSpacing: {
    height: 32,
  },
});

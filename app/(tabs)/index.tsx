import React, { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Share,
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

export default function TodayScreen() {
  const colorScheme = useColorScheme();
  const { prayerTimes, refreshData, isLoading } = usePrayerTimes();
  const [todaysPrayers, setTodaysPrayers] = useState<PrayerTime | null>(null);
  const [currentPrayer, setCurrentPrayer] = useState<PrayerName | null>(null);
  const [nextPrayer, setNextPrayer] = useState<PrayerName | null>(null);
  const [timeUntilNext, setTimeUntilNext] = useState("");

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

      let message = `Masjid Abubakr Siddique Prayer Times\n${dateStr}\n\n`;
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

  // Show "no data" state when prayer times haven't been uploaded yet
  if (!Array.isArray(prayerTimes) || prayerTimes.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
        }
      >
        <ThemedView style={styles.header}>
          <View>
            <ThemedText type="title" style={styles.mosqueeName}>
              Masjid Abubakr Siddique
            </ThemedText>
            <ThemedText style={styles.date}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </ThemedText>
          </View>
        </ThemedView>

        <ThemedView style={styles.noDataCard}>
          <IconSymbol
            name="calendar"
            size={64}
            color={Colors[colorScheme ?? "light"].text}
          />
          <ThemedText type="subtitle" style={styles.noDataTitle}>
            No Prayer Times Available
          </ThemedText>
          <ThemedText style={styles.noDataText}>
            Prayer times haven't been uploaded yet. Please contact the admin to
            upload the prayer timetable.
          </ThemedText>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refreshData}
            disabled={isLoading}
          >
            <IconSymbol name="arrow.clockwise" size={20} color="#fff" />
            <ThemedText style={styles.refreshButtonText}>
              {isLoading ? "Checking..." : "Check Again"}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    );
  }

  // Show "no data for today" if we have prayer times but not for today
  if (!todaysPrayers) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
        }
      >
        <ThemedView style={styles.header}>
          <View>
            <ThemedText type="title" style={styles.mosqueeName}>
              Masjid Abubakr Siddique
            </ThemedText>
            <ThemedText style={styles.date}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </ThemedText>
          </View>
        </ThemedView>

        <ThemedView style={styles.noDataCard}>
          <IconSymbol
            name="calendar"
            size={64}
            color={Colors[colorScheme ?? "light"].text}
          />
          <ThemedText type="subtitle" style={styles.noDataTitle}>
            No Prayer Times for Today
          </ThemedText>
          <ThemedText style={styles.noDataText}>
            Prayer times for today are not available. The timetable may need to
            be updated.
          </ThemedText>
        </ThemedView>
      </ScrollView>
    );
  }

  const prayers = extractPrayersFromTime(todaysPrayers);
  const todayDate = new Date(todaysPrayers.d_date);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
      }
    >
      <ThemedView style={styles.header}>
        <View>
          <ThemedText type="title" style={styles.mosqueeName}>
            Masjid Abubakr Siddique
          </ThemedText>
          <ThemedText style={styles.date}>
            {todayDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </ThemedText>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <IconSymbol
            name="square.and.arrow.up"
            size={24}
            color={Colors[colorScheme ?? "light"].text}
          />
        </TouchableOpacity>
      </ThemedView>

      {nextPrayer && (
        <ThemedView style={styles.nextPrayerCard}>
          <ThemedText style={styles.nextPrayerLabel}>Next Prayer</ThemedText>
          <ThemedText type="title" style={styles.nextPrayerName}>
            {nextPrayer.charAt(0).toUpperCase() + nextPrayer.slice(1)}
          </ThemedText>
          <ThemedText style={styles.timeUntil}>in {timeUntilNext}</ThemedText>
        </ThemedView>
      )}

      <ThemedView style={styles.prayersList}>
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

      {todaysPrayers.is_ramadan === 1 && (
        <ThemedView style={styles.ramadanBadge}>
          <ThemedText style={styles.ramadanText}>🌙 Ramadan</ThemedText>
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    paddingTop: 60,
  },
  mosqueeName: {
    fontSize: 24,
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    opacity: 0.7,
  },
  shareButton: {
    padding: 8,
  },
  nextPrayerCard: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#1B5E20",
    alignItems: "center",
  },
  nextPrayerLabel: {
    color: "#fff",
    opacity: 0.8,
    fontSize: 14,
  },
  nextPrayerName: {
    color: "#fff",
    fontSize: 28,
    marginVertical: 4,
  },
  timeUntil: {
    color: "#fff",
    fontSize: 18,
  },
  prayersList: {
    padding: 20,
    paddingTop: 0,
  },
  ramadanBadge: {
    margin: 20,
    marginTop: 0,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F9A825",
    alignItems: "center",
  },
  ramadanText: {
    fontSize: 16,
    fontWeight: "600",
  },
  noDataCard: {
    margin: 20,
    padding: 40,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    gap: 16,
  },
  noDataTitle: {
    fontSize: 20,
    textAlign: "center",
  },
  noDataText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 24,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1B5E20",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

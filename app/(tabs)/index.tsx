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
      const today = getTodayString();
      const todayData = prayerTimes.find((pt) => pt.d_date === today);

      if (todayData) {
        setTodaysPrayers(todayData);
        const { current, next } = getCurrentPrayerAndNext(todayData);
        setCurrentPrayer(current);
        setNextPrayer(next);

        // Update time until next prayer
        const nextPrayerTime = (todayData as any)[`${next}_begins`];
        setTimeUntilNext(getTimeUntilNext(nextPrayerTime));
      }
    };

    updateTodaysPrayers();
    const interval = setInterval(updateTodaysPrayers, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [prayerTimes]);

  const handleShare = async () => {
    if (!todaysPrayers) return;

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
      if (prayer.jamah) {
        message += `${prayer.name}: ${prayer.begins} (Jamah: ${prayer.jamah})\n`;
      } else {
        message += `${prayer.name}: ${prayer.begins}\n`;
      }
    });

    try {
      await Share.share({
        message,
        title: "Prayer Times",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  if (!todaysPrayers) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading prayer times...</ThemedText>
      </ThemedView>
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
});

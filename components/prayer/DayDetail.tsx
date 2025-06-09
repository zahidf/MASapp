import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { PrayerTime } from "@/types/prayer";
import { extractPrayersFromTime } from "@/utils/dateHelpers";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { PrayerTimeCard } from "./PrayerTimeCard";

interface DayDetailProps {
  prayerTime: PrayerTime;
  onClose: () => void;
}

export function DayDetail({ prayerTime, onClose }: DayDetailProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const date = new Date(prayerTime.d_date);
  const prayers = extractPrayersFromTime(prayerTime);

  const handleShare = async () => {
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ThemedView
        style={[
          styles.header,
          {
            borderBottomColor: colorScheme === "dark" ? "#404040" : "#e0e0e0",
          },
        ]}
      >
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <IconSymbol name="xmark" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <ThemedText
            type="title"
            style={[styles.title, { color: colors.text }]}
          >
            {date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </ThemedText>
          <ThemedText style={[styles.year, { color: `${colors.text}B3` }]}>
            {date.getFullYear()}
          </ThemedText>
        </View>

        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <IconSymbol
            name="square.and.arrow.up"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
      </ThemedView>

      <ScrollView style={styles.content}>
        <ThemedView style={styles.prayersList}>
          {prayers.map((prayer, index) => (
            <PrayerTimeCard key={index} prayer={prayer} />
          ))}
        </ThemedView>

        {prayerTime.is_ramadan === 1 && (
          <ThemedView
            style={[
              styles.ramadanBadge,
              {
                backgroundColor: colorScheme === "dark" ? "#B8860B" : "#F9A825",
              },
            ]}
          >
            <ThemedText
              style={[
                styles.ramadanText,
                {
                  color: colorScheme === "dark" ? "#FFFFFF" : "#FFFFFF",
                },
              ]}
            >
              🌙 Ramadan
            </ThemedText>
          </ThemedView>
        )}

        {prayerTime.hijri_date && prayerTime.hijri_date !== "0" && (
          <ThemedView
            style={[
              styles.hijriDate,
              {
                backgroundColor: colors.surface,
              },
            ]}
          >
            <ThemedText
              style={[styles.hijriLabel, { color: `${colors.text}B3` }]}
            >
              Hijri Date
            </ThemedText>
            <ThemedText style={[styles.hijriText, { color: colors.text }]}>
              {prayerTime.hijri_date}
            </ThemedText>
          </ThemedView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  shareButton: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    textAlign: "center",
  },
  year: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  prayersList: {
    padding: 20,
  },
  ramadanBadge: {
    margin: 20,
    marginTop: 0,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  ramadanText: {
    fontSize: 16,
    fontWeight: "600",
  },
  hijriDate: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  hijriLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  hijriText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

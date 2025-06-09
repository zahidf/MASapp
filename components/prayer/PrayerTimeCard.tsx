import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Prayer } from "@/types/prayer";
import { formatTimeForDisplay } from "@/utils/dateHelpers";
import React from "react";
import { StyleSheet, View } from "react-native";

interface PrayerTimeCardProps {
  prayer: Prayer;
  isActive?: boolean;
  isNext?: boolean;
}

export function PrayerTimeCard({
  prayer,
  isActive,
  isNext,
}: PrayerTimeCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const getPrayerIcon = (prayerName: string) => {
    switch (prayerName.toLowerCase()) {
      case "fajr":
        return "moon";
      case "sunrise":
        return "sun.max";
      case "zuhr":
      case "asr":
        return "sun.max";
      case "maghrib":
        return "sun.max";
      case "isha":
        return "moon";
      default:
        return "clock";
    }
  };

  const cardStyle = [
    styles.card,
    isActive && styles.activeCard,
    isNext && styles.nextCard,
    isDark && styles.darkCard,
  ];

  const nameStyle = [
    styles.prayerName,
    (isActive || isNext) && styles.highlightedText,
    isDark && styles.darkText,
  ];

  return (
    <ThemedView style={cardStyle}>
      <View style={styles.leftSection}>
        <View style={[styles.iconContainer, isActive && styles.activeIcon]}>
          <IconSymbol
            name={getPrayerIcon(prayer.name)}
            size={20}
            color={
              isActive || isNext
                ? "#fff"
                : Colors[colorScheme ?? "light"].primary
            }
          />
        </View>
        <View style={styles.prayerInfo}>
          <ThemedText style={nameStyle}>{prayer.name}</ThemedText>
          {isActive && (
            <View style={styles.statusBadge}>
              <View style={styles.activeDot} />
              <ThemedText style={styles.badgeText}>Current</ThemedText>
            </View>
          )}
          {isNext && !isActive && (
            <View style={[styles.statusBadge, styles.nextBadge]}>
              <ThemedText style={styles.badgeText}>Next</ThemedText>
            </View>
          )}
        </View>
      </View>

      <View style={styles.rightSection}>
        <View style={styles.timeContainer}>
          <ThemedText style={styles.timeLabel}>Begins</ThemedText>
          <ThemedText
            style={[
              styles.time,
              (isActive || isNext) && styles.highlightedText,
            ]}
          >
            {formatTimeForDisplay(prayer.begins)}
          </ThemedText>
        </View>

        {prayer.jamah && prayer.jamah.trim() !== "" && (
          <View style={styles.timeContainer}>
            <ThemedText style={styles.timeLabel}>Jamah</ThemedText>
            <ThemedText
              style={[
                styles.jamahTime,
                (isActive || isNext) && styles.highlightedText,
              ]}
            >
              {formatTimeForDisplay(prayer.jamah)}
            </ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: "#f8f9fa",
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  darkCard: {
    backgroundColor: "#2a2a2a",
  },
  activeCard: {
    backgroundColor: "#E8F5E9",
    borderColor: "#1B5E20",
    shadowColor: "#1B5E20",
    shadowOpacity: 0.2,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  nextCard: {
    backgroundColor: "#FFF3E0",
    borderColor: "#F9A825",
    shadowColor: "#F9A825",
    shadowOpacity: 0.15,
    elevation: 6,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(27, 94, 32, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  activeIcon: {
    backgroundColor: "#1B5E20",
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  darkText: {
    color: "#fff",
  },
  highlightedText: {
    color: "#1B5E20",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nextBadge: {
    gap: 0,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1B5E20",
    opacity: 0.8,
  },
  rightSection: {
    flexDirection: "row",
    gap: 24,
    alignItems: "center",
  },
  timeContainer: {
    alignItems: "center",
    minWidth: 60,
  },
  timeLabel: {
    fontSize: 11,
    opacity: 0.6,
    marginBottom: 4,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  jamahTime: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
    color: "#1B5E20",
  },
});

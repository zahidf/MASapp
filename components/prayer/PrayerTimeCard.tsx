import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
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
        <ThemedText style={nameStyle}>{prayer.name}</ThemedText>
        {isActive && <ThemedText style={styles.badge}>Current</ThemedText>}
        {isNext && !isActive && (
          <ThemedText style={styles.badge}>Next</ThemedText>
        )}
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

        {prayer.jamah && (
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
    padding: 16,
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "transparent",
  },
  darkCard: {
    backgroundColor: "#2a2a2a",
  },
  activeCard: {
    backgroundColor: "#E8F5E9",
    borderColor: "#1B5E20",
  },
  nextCard: {
    backgroundColor: "#FFF3E0",
    borderColor: "#F9A825",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  prayerName: {
    fontSize: 18,
    fontWeight: "600",
  },
  darkText: {
    color: "#fff",
  },
  highlightedText: {
    color: "#1B5E20",
  },
  badge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: "#1B5E20",
    color: "#fff",
    overflow: "hidden",
  },
  rightSection: {
    flexDirection: "row",
    gap: 24,
  },
  timeContainer: {
    alignItems: "center",
  },
  timeLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 2,
  },
  time: {
    fontSize: 18,
    fontWeight: "600",
  },
  jamahTime: {
    fontSize: 18,
    fontWeight: "700",
  },
});

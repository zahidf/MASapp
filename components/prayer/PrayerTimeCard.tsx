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
  const colors = Colors[colorScheme ?? "light"];

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
    { backgroundColor: colors.surface },
    isActive && [
      styles.activeCard,
      {
        backgroundColor: colorScheme === "dark" ? "#2E7D32" : "#E8F5E9",
        borderColor: colors.primary,
      },
    ],
    isNext && [
      styles.nextCard,
      {
        backgroundColor: colorScheme === "dark" ? "#B8860B" : "#FFF3E0",
        borderColor: colors.secondary,
      },
    ],
  ];

  const getTextColor = () => {
    if (isActive || isNext) {
      return colorScheme === "dark" ? "#FFFFFF" : colors.primary;
    }
    return colors.text;
  };

  const getIconColor = () => {
    if (isActive || isNext) {
      return colorScheme === "dark" ? "#FFFFFF" : "#FFFFFF";
    }
    return colors.primary;
  };

  return (
    <ThemedView style={cardStyle}>
      <View style={styles.leftSection}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor:
                isActive || isNext ? colors.primary : `${colors.primary}20`,
            },
          ]}
        >
          <IconSymbol
            name={getPrayerIcon(prayer.name)}
            size={20}
            color={getIconColor()}
          />
        </View>
        <View style={styles.prayerInfo}>
          <ThemedText style={[styles.prayerName, { color: getTextColor() }]}>
            {prayer.name}
          </ThemedText>
          {isActive && (
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.activeDot,
                  {
                    backgroundColor:
                      colorScheme === "dark" ? "#81C784" : "#4CAF50",
                  },
                ]}
              />
              <ThemedText style={[styles.badgeText, { color: getTextColor() }]}>
                Current
              </ThemedText>
            </View>
          )}
          {isNext && !isActive && (
            <View style={[styles.statusBadge, styles.nextBadge]}>
              <ThemedText style={[styles.badgeText, { color: getTextColor() }]}>
                Next
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      <View style={styles.rightSection}>
        <View style={styles.timeContainer}>
          <ThemedText
            style={[styles.timeLabel, { color: `${getTextColor()}80` }]}
          >
            Begins
          </ThemedText>
          <ThemedText style={[styles.time, { color: getTextColor() }]}>
            {formatTimeForDisplay(prayer.begins)}
          </ThemedText>
        </View>

        {prayer.jamah && prayer.jamah.trim() !== "" && (
          <View style={styles.timeContainer}>
            <ThemedText
              style={[styles.timeLabel, { color: `${getTextColor()}80` }]}
            >
              Jamah
            </ThemedText>
            <ThemedText
              style={[
                styles.jamahTime,
                {
                  color: isActive || isNext ? getTextColor() : colors.primary,
                },
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
  activeCard: {
    shadowOpacity: 0.2,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  nextCard: {
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
    justifyContent: "center",
    alignItems: "center",
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
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
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
  },
});

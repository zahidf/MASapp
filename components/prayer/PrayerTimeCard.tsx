import React from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface Prayer {
  name: string;
  begins: string;
  jamah?: string;
}

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

  const getCardStyle = () => {
    if (isActive) {
      return [
        styles.prayerCard,
        styles.activePrayerCard,
        { backgroundColor: colors.primary, borderColor: colors.primary },
      ];
    }
    if (isNext) {
      return [
        styles.prayerCard,
        styles.nextPrayerCard,
        { backgroundColor: colors.surface, borderColor: colors.primary },
      ];
    }
    return [
      styles.prayerCard,
      { backgroundColor: colors.surface, borderColor: `${colors.text}20` },
    ];
  };

  const getTextColor = () => {
    if (isActive) return "#fff";
    return colors.text;
  };

  const getSecondaryTextColor = () => {
    if (isActive) return "rgba(255,255,255,0.8)";
    return `${colors.text}80`;
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

  return (
    <View style={getCardStyle()}>
      <View style={styles.prayerCardContent}>
        <View style={styles.prayerIconContainer}>
          <IconSymbol
            name={getPrayerIcon(prayer.name)}
            size={24}
            color={isActive ? "#fff" : colors.primary}
          />
        </View>

        <View style={styles.prayerInfo}>
          <ThemedText
            style={[
              styles.prayerName,
              {
                color: getTextColor(),
                fontWeight: isActive || isNext ? "800" : "600",
              },
            ]}
          >
            {prayer.name}
          </ThemedText>
          <ThemedText style={[styles.prayerTime, { color: getTextColor() }]}>
            {prayer.begins}
          </ThemedText>
          {prayer.jamah && prayer.jamah.trim() !== "" && (
            <ThemedText
              style={[styles.jamahTime, { color: getSecondaryTextColor() }]}
            >
              Jamah: {prayer.jamah}
            </ThemedText>
          )}
        </View>

        {(isActive || isNext) && (
          <View style={styles.statusIndicator}>
            <IconSymbol
              name={isActive ? "dot.radiowaves.left.and.right" : "clock.badge"}
              size={16}
              color={isActive ? "#fff" : colors.primary}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  prayerCard: {
    borderRadius: 12,
    marginVertical: 4,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activePrayerCard: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  nextPrayerCard: {
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  prayerCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  prayerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: 18,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  prayerTime: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  jamahTime: {
    fontSize: 13,
    fontWeight: "500",
  },
  statusIndicator: {
    padding: 8,
  },
});

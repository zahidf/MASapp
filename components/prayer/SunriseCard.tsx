import React from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { BlurView } from "expo-blur";
import { useLanguage } from "@/contexts/LanguageContext";

interface SunriseCardProps {
  time: string;
  isActive?: boolean;
  isNext?: boolean;
  pulseAnim?: Animated.Value;
  getCountdownToNext?: () => string;
}

export function SunriseCard({
  time,
  isActive = false,
  isNext = false,
  pulseAnim,
  getCountdownToNext,
}: SunriseCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { t } = useLanguage();

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

  // More subtle animation for sunrise
  const cardOpacity = isActive ? 0.95 : isNext ? 0.9 : 0.85;
  const cardScale = isActive && pulseAnim ? 
    Animated.add(1, Animated.multiply(Animated.add(pulseAnim, -1), 0.3)) : 1;

  return (
    <Animated.View
      style={[
        {
          opacity: cardOpacity,
          transform: [{ scale: cardScale }],
        },
        styles.sunriseWrapper,
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={50}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={[
            styles.sunriseCard,
            {
              backgroundColor: colorScheme === "dark"
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.02)",
              borderColor: colorScheme === "dark"
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.03)",
            },
          ]}
        >
          <View style={styles.sunriseContent}>
            {/* Left Section - Icon and Label */}
            <View style={styles.leftSection}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: colorScheme === "dark"
                      ? "rgba(255,183,77,0.12)"
                      : "rgba(255,152,0,0.08)",
                  },
                ]}
              >
                <IconSymbol
                  name="sun.max"
                  size={18}
                  color={
                    colorScheme === "dark"
                      ? "#FFB74D"
                      : "#FF9800"
                  }
                />
              </View>
              
              <View style={styles.labelContainer}>
                <ThemedText
                  style={[
                    styles.sunriseLabel,
                    { color: colors.text + "60" }
                  ]}
                >
                  {t.prayers.sunrise}
                </ThemedText>
                {(isActive || isNext) && (
                  <ThemedText
                    style={[
                      styles.statusLabel,
                      { color: colors.text + "40" }
                    ]}
                  >
                    {isActive ? t.prayers.now : getCountdownToNext ? getCountdownToNext() : t.prayers.next}
                  </ThemedText>
                )}
              </View>
            </View>

            {/* Right Section - Time */}
            <View style={styles.rightSection}>
              <ThemedText
                style={[
                  styles.timeValue,
                  {
                    color: colors.text + "70",
                  }
                ]}
              >
                {formatTime(time)}
              </ThemedText>
            </View>
          </View>
        </BlurView>
      ) : (
        <View
          style={[
            styles.sunriseCard,
            {
              backgroundColor: colors.surface,
              borderColor: colorScheme === "dark"
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.03)",
            },
          ]}
        >
          <View style={styles.sunriseContent}>
            {/* Left Section - Icon and Label */}
            <View style={styles.leftSection}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: colorScheme === "dark"
                      ? "rgba(255,183,77,0.12)"
                      : "rgba(255,152,0,0.08)",
                  },
                ]}
              >
                <IconSymbol
                  name="sun.max"
                  size={18}
                  color={
                    colorScheme === "dark"
                      ? "#FFB74D"
                      : "#FF9800"
                  }
                />
              </View>
              
              <View style={styles.labelContainer}>
                <ThemedText
                  style={[
                    styles.sunriseLabel,
                    { color: colors.text + "60" }
                  ]}
                >
                  {t.prayers.sunrise}
                </ThemedText>
                {(isActive || isNext) && (
                  <ThemedText
                    style={[
                      styles.statusLabel,
                      { color: colors.text + "40" }
                    ]}
                  >
                    {isActive ? t.prayers.now : getCountdownToNext ? getCountdownToNext() : t.prayers.next}
                  </ThemedText>
                )}
              </View>
            </View>

            {/* Right Section - Time */}
            <View style={styles.rightSection}>
              <ThemedText
                style={[
                  styles.timeValue,
                  {
                    color: colors.text + "70",
                  }
                ]}
              >
                {formatTime(time)}
              </ThemedText>
            </View>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sunriseWrapper: {
    // Smaller shadow for less emphasis
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  sunriseCard: {
    borderRadius: 14, // Smaller radius for compact design
    overflow: "hidden",
    borderWidth: 1,
    // Reduced height for horizontal layout
    minHeight: 56,
  },

  sunriseContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  labelContainer: {
    gap: 2,
  },

  sunriseLabel: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.2,
  },

  statusLabel: {
    fontSize: 11,
    letterSpacing: -0.08,
  },

  rightSection: {
    alignItems: "flex-end",
  },

  timeValue: {
    fontSize: 20,
    fontWeight: "500",
    letterSpacing: -0.4,
  },
});
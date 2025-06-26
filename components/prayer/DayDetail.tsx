import { BlurView } from "expo-blur";
import React, { useState } from "react";
import {
  Animated,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { PrayerTimeCard } from "./PrayerTimeCard";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { PrayerTime } from "@/types/prayer";
import { getCurrentPrayerAndNext } from "@/utils/dateHelpers";
import { PrayerTimesDisplay } from "./PrayerTimesDisplay";

interface DayDetailProps {
  prayerTime: PrayerTime;
  onClose: () => void;
}

export function DayDetail({ prayerTime, onClose }: DayDetailProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const date = new Date(prayerTime.d_date);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [headerAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  // Check if the selected date is today
  const today = new Date();
  const isToday = 
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  // Get current and next prayer only if it's today
  const { current: currentPrayer, next: nextPrayer } = isToday 
    ? getCurrentPrayerAndNext(prayerTime)
    : { current: null, next: null };

  React.useEffect(() => {
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(headerAnim, {
        toValue: 1,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Start pulse animation for active prayer only if it's today
    if (isToday) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, []);

  const handleShare = async () => {
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let message = `Masjid Abubakr Siddique Prayer Times\n${dateStr}\n\n`;
    
    // Add prayer times in order
    const prayers = [
      { name: "Fajr", begins: prayerTime.fajr_begins, jamah: prayerTime.fajr_jamah },
      { name: "Sunrise", begins: prayerTime.sunrise, jamah: "" },
      { name: "Zuhr", begins: prayerTime.zuhr_begins, jamah: prayerTime.zuhr_jamah },
      { name: "Asr", begins: prayerTime.asr_mithl_1, jamah: prayerTime.asr_jamah },
      { name: "Maghrib", begins: prayerTime.maghrib_begins, jamah: prayerTime.maghrib_jamah },
      { name: "Isha", begins: prayerTime.isha_begins, jamah: prayerTime.isha_jamah },
    ];

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

  // Function to get countdown to next prayer
  const getCountdownToNext = (): string => {
    // Only show countdown for today
    if (!isToday || !nextPrayer) return "";

    const prayerTimes = {
      fajr: prayerTime.fajr_begins,
      sunrise: prayerTime.sunrise,
      zuhr: prayerTime.zuhr_begins,
      asr: prayerTime.asr_mithl_1,
      maghrib: prayerTime.maghrib_begins,
      isha: prayerTime.isha_begins,
    };

    const nextPrayerTime = prayerTimes[nextPrayer];
    if (!nextPrayerTime) return "";

    const now = new Date();
    const [hours, minutes] = nextPrayerTime.split(":");
    const nextTime = new Date();
    nextTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (nextTime < now) {
      nextTime.setDate(nextTime.getDate() + 1);
    }

    const diff = nextTime.getTime() - now.getTime();

    if (diff <= 0) return "Now";

    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hoursLeft > 0) {
      return `${hoursLeft}h ${minutesLeft}m`;
    } else {
      return `${minutesLeft}m`;
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      {/* Enhanced iOS-style Navigation Header */}
      <Animated.View
        style={[
          styles.headerWrapper,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <BlurView
          intensity={85}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={colors.text + "80"} />
            </TouchableOpacity>

            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {date.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.text + "60" }]}>
                {date.getFullYear()}
              </Text>
            </View>

            <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
              <IconSymbol
                name="square.and.arrow.up"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        </BlurView>

        {/* Header edge effect */}
        <View style={styles.headerEdgeEffect}>
          <View
            style={[
              styles.headerEdgeGradient,
              {
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(0,0,0,0.2)"
                    : "rgba(0,0,0,0.08)",
              },
            ]}
          />
        </View>
      </Animated.View>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Ramadan Badge */}
          {prayerTime.is_ramadan === 1 && (
            <BlurView
              intensity={60}
              tint={colorScheme === "dark" ? "dark" : "light"}
              style={[
                styles.ramadanBadge,
                {
                  backgroundColor:
                    colorScheme === "dark" ? "#B8860B15" : "#F9A82515",
                  borderColor:
                    colorScheme === "dark" ? "#B8860B30" : "#F9A82530",
                },
              ]}
            >
              <Text style={styles.ramadanIcon}>🌙</Text>
              <ThemedText
                style={[
                  styles.ramadanText,
                  {
                    color: colorScheme === "dark" ? "#FFD700" : "#F9A825",
                  },
                ]}
              >
                Ramadan Mubarak
              </ThemedText>
            </BlurView>
          )}

          {/* Prayer Times List */}
          <View style={styles.prayersList}>
            <PrayerTimesDisplay
              prayerTime={prayerTime}
              currentPrayer={currentPrayer}
              nextPrayer={nextPrayer}
              pulseAnim={pulseAnim}
              getCountdownToNext={getCountdownToNext}
              hideNotificationToggle={true}
            />
          </View>

          {/* Hijri Date Card */}
          {prayerTime.hijri_date && prayerTime.hijri_date !== "0" && (
            <BlurView
              intensity={60}
              tint={colorScheme === "dark" ? "dark" : "light"}
              style={[
                styles.hijriCard,
                {
                  backgroundColor: colors.surface + "95",
                  borderColor:
                    colorScheme === "dark"
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                },
              ]}
            >
              <View
                style={[
                  styles.hijriIconContainer,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <IconSymbol name="calendar" size={24} color={colors.primary} />
              </View>
              <View style={styles.hijriContent}>
                <ThemedText
                  style={[styles.hijriLabel, { color: colors.text + "60" }]}
                >
                  Hijri Date
                </ThemedText>
                <ThemedText style={[styles.hijriText, { color: colors.text }]}>
                  {prayerTime.hijri_date}
                </ThemedText>
              </View>
            </BlurView>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Enhanced iOS-style header
  headerWrapper: {
    backgroundColor: "transparent",
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  header: {
    paddingTop: Platform.OS === "ios" ? 10 : StatusBar.currentHeight || 24,
    paddingBottom: 16,
  },

  headerEdgeEffect: {
    height: 1,
  },

  headerEdgeGradient: {
    height: 1,
    opacity: 0.15,
  },

  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },

  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
  },

  headerTextContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: 2,
  },

  headerSubtitle: {
    fontSize: 15,
    fontWeight: "400",
    letterSpacing: -0.2,
    textAlign: "center",
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },

  // Ramadan Badge
  ramadanBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },

  ramadanIcon: {
    fontSize: 20,
  },

  ramadanText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },

  // Prayers List
  prayersList: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  // Hijri Date Card
  hijriCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },

  hijriIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  hijriContent: {
    flex: 1,
  },

  hijriLabel: {
    fontSize: 13,
    letterSpacing: -0.08,
    marginBottom: 2,
  },

  hijriText: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },

  // Info Card
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },

  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  infoContent: {
    flex: 1,
  },

  infoText: {
    fontSize: 14,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
});
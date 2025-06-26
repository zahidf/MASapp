import React from "react";
import { View, StyleSheet } from "react-native";
import { PrayerTimeCard } from "./PrayerTimeCard";
import { PrayerTime } from "@/types/prayer";

interface PrayerTimesDisplayProps {
  prayerTime: PrayerTime;
  currentPrayer: string | null;
  nextPrayer: string | null;
  pulseAnim?: any;
  getCountdownToNext?: () => string;
  hideNotificationToggle?: boolean;
}

export function PrayerTimesDisplay({
  prayerTime,
  currentPrayer,
  nextPrayer,
  pulseAnim,
  getCountdownToNext,
  hideNotificationToggle = false,
}: PrayerTimesDisplayProps) {
  return (
    <View style={styles.container}>
      {/* Fajr Prayer Card */}
      <PrayerTimeCard
        name="Fajr"
        time={prayerTime.fajr_begins}
        jamah={prayerTime.fajr_jamah}
        isActive={currentPrayer === "fajr"}
        isNext={nextPrayer === "fajr"}
        pulseAnim={pulseAnim}
        getCountdownToNext={getCountdownToNext}
        hideNotificationToggle={hideNotificationToggle}
      />
      
      {/* Sunrise Card - Right after Fajr with special spacing */}
      <View style={styles.sunriseSection}>
        <PrayerTimeCard
          name="Sunrise"
          time={prayerTime.sunrise}
          isActive={currentPrayer === "sunrise"}
          isNext={nextPrayer === "sunrise"}
          pulseAnim={pulseAnim}
          getCountdownToNext={getCountdownToNext}
          hideNotificationToggle={hideNotificationToggle}
          isSunrise={true}
        />
      </View>

      {/* Remaining Prayer Cards */}
      <View style={styles.remainingPrayersSection}>
        <PrayerTimeCard
          name="Zuhr"
          time={prayerTime.zuhr_begins}
          jamah={prayerTime.zuhr_jamah}
          isActive={currentPrayer === "zuhr"}
          isNext={nextPrayer === "zuhr"}
          pulseAnim={pulseAnim}
          getCountdownToNext={getCountdownToNext}
          hideNotificationToggle={hideNotificationToggle}
        />
        
        <PrayerTimeCard
          name="Asr"
          time={prayerTime.asr_mithl_1}
          jamah={prayerTime.asr_jamah}
          isActive={currentPrayer === "asr"}
          isNext={nextPrayer === "asr"}
          pulseAnim={pulseAnim}
          getCountdownToNext={getCountdownToNext}
          hideNotificationToggle={hideNotificationToggle}
        />
        
        <PrayerTimeCard
          name="Maghrib"
          time={prayerTime.maghrib_begins}
          jamah={prayerTime.maghrib_jamah}
          isActive={currentPrayer === "maghrib"}
          isNext={nextPrayer === "maghrib"}
          pulseAnim={pulseAnim}
          getCountdownToNext={getCountdownToNext}
          hideNotificationToggle={hideNotificationToggle}
        />
        
        <PrayerTimeCard
          name="Isha"
          time={prayerTime.isha_begins}
          jamah={prayerTime.isha_jamah}
          isActive={currentPrayer === "isha"}
          isNext={nextPrayer === "isha"}
          pulseAnim={pulseAnim}
          getCountdownToNext={getCountdownToNext}
          hideNotificationToggle={hideNotificationToggle}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16, // Standard gap between elements
  },
  sunriseSection: {
    marginTop: -8, // Reduce space between Fajr and Sunrise
    marginBottom: 0, // Use container's gap for consistent spacing
  },
  remainingPrayersSection: {
    gap: 16, // Standard gap between prayer cards
  },
});
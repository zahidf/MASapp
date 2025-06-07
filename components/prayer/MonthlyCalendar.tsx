import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useColorScheme } from "@/hooks/useColorScheme";
import { PrayerTime } from "@/types/prayer";
import { getDaysInMonth, getTodayString } from "@/utils/dateHelpers";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface MonthlyCalendarProps {
  month: number;
  year: number;
  monthData: PrayerTime[];
  onDaySelect: (day: number) => void;
}

export function MonthlyCalendar({
  month,
  year,
  monthData,
  onDaySelect,
}: MonthlyCalendarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const today = getTodayString();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const renderCalendarDays = () => {
    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
      const dayData = monthData.find((pt) => pt.d_date === dateStr);
      const isToday = dateStr === today;
      const isRamadan = dayData?.is_ramadan === 1;

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            isToday && styles.todayCell,
            isRamadan && styles.ramadanCell,
          ]}
          onPress={() => onDaySelect(day)}
          disabled={!dayData}
        >
          <ThemedText
            style={[
              styles.dayText,
              isToday && styles.todayText,
              !dayData && styles.disabledText,
              isDark && styles.darkText,
            ]}
          >
            {day}
          </ThemedText>
          {isRamadan && <ThemedText style={styles.ramadanIcon}>🌙</ThemedText>}
        </TouchableOpacity>
      );
    }

    return days;
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.weekDaysRow}>
        {weekDays.map((day) => (
          <ThemedText key={day} style={styles.weekDayText}>
            {day}
          </ThemedText>
        ))}
      </View>

      <View style={styles.calendarGrid}>{renderCalendarDays()}</View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  weekDayText: {
    width: 40,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.7,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    padding: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 16,
  },
  darkText: {
    color: "#fff",
  },
  todayCell: {
    backgroundColor: "#1B5E20",
    borderRadius: 8,
  },
  todayText: {
    color: "#fff",
    fontWeight: "600",
  },
  ramadanCell: {
    backgroundColor: "#FFF3E0",
    borderRadius: 8,
  },
  ramadanIcon: {
    fontSize: 10,
    position: "absolute",
    top: 2,
    right: 2,
  },
  disabledText: {
    opacity: 0.3,
  },
});

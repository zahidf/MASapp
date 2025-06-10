import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { PrayerTime } from "@/types/prayer";
import { getDaysInMonth, getTodayString } from "@/utils/dateHelpers";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

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
  const colors = Colors[colorScheme ?? "light"];
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
      const hasData = !!dayData;

      const renderDayContent = () => (
        <View style={styles.dayContent}>
          <ThemedText
            style={[
              styles.dayText,
              { color: colors.text },
              isToday && styles.todayText,
              !hasData && [styles.disabledText, { color: `${colors.text}40` }],
            ]}
          >
            {day}
          </ThemedText>
          {isRamadan && (
            <View style={styles.ramadanIndicator}>
              <ThemedText style={styles.ramadanIcon}>🌙</ThemedText>
            </View>
          )}
          {hasData && !isToday && (
            <View
              style={[
                styles.dataIndicator,
                { backgroundColor: colors.primary },
              ]}
            />
          )}
        </View>
      );

      const cellStyle = [
        styles.dayCell,
        styles.clickableDay,
        isToday && [styles.todayCell, { backgroundColor: colors.primary }],
        isRamadan &&
          !isToday && [
            styles.ramadanCell,
            {
              backgroundColor: colorScheme === "dark" ? "#3E2723" : "#FFF3E0",
            },
          ],
        !hasData && styles.disabledCell,
      ];

      if (hasData) {
        days.push(
          <Pressable
            key={day}
            style={({ pressed }) => [
              cellStyle,
              pressed && [
                styles.pressedCell,
                { backgroundColor: `${colors.primary}20` },
              ],
            ]}
            onPress={() => onDaySelect(day)}
            android_ripple={{
              color: `${colors.primary}30`,
              borderless: false,
            }}
          >
            {renderDayContent()}
          </Pressable>
        );
      } else {
        days.push(
          <View key={day} style={cellStyle}>
            {renderDayContent()}
          </View>
        );
      }
    }

    return days;
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Week Days Header */}
      <View
        style={[styles.weekDaysContainer, { backgroundColor: colors.primary }]}
      >
        {weekDays.map((day) => (
          <View key={day} style={styles.weekDayCell}>
            <ThemedText style={styles.weekDayText}>{day}</ThemedText>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>{renderCalendarDays()}</View>

      {/* Helper Text */}
      <View style={styles.helperText}>
        <ThemedText
          style={[styles.helperTextContent, { color: `${colors.text}80` }]}
        >
          Tap any day with prayer times to view details
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  weekDaysContainer: {
    flexDirection: "row",
    paddingVertical: 16,
  },
  weekDayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  weekDayText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "transparent",
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  clickableDay: {
    borderRadius: 12,
    margin: 2,
  },
  dayContent: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dayText: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  todayCell: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.05 }],
  },
  todayText: {
    color: "#fff",
    fontWeight: "800",
  },
  ramadanCell: {
    borderWidth: 2,
    borderColor: "#FF9800",
  },
  ramadanIndicator: {
    position: "absolute",
    top: 2,
    right: 2,
  },
  ramadanIcon: {
    fontSize: 12,
  },
  dataIndicator: {
    position: "absolute",
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  disabledCell: {
    opacity: 0.3,
  },
  disabledText: {
    fontWeight: "400",
  },
  pressedCell: {
    transform: [{ scale: 0.95 }],
  },
  helperText: {
    padding: 16,
    alignItems: "center",
  },
  helperTextContent: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0.3,
  },
});

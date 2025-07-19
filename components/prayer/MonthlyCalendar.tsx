import { BlurView } from "expo-blur";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { PrayerTime } from "@/types/prayer";
import { getDaysInMonth, getTodayString } from "@/utils/dateHelpers";

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
  const { t } = useLanguage();
  const today = getTodayString();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

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

      days.push(
        <Pressable
          key={day}
          style={({ pressed }) => [
            styles.dayCell,
            hasData && styles.dayWithData,
            isToday && styles.todayCell,
            pressed && hasData && styles.pressedCell,
            !hasData && styles.emptyDataCell,
          ]}
          onPress={() => hasData && onDaySelect(day)}
          disabled={!hasData}
        >
          {({ pressed }) => (
            <BlurView
              intensity={isToday ? 0 : pressed && hasData ? 60 : 0}
              tint={colorScheme === "dark" ? "dark" : "light"}
              style={[
                styles.dayContent,
                isToday && [
                  styles.todayContent,
                  { backgroundColor: colors.tint },
                ],
                isRamadan &&
                  !isToday && [
                    styles.ramadanContent,
                    {
                      backgroundColor:
                        colorScheme === "dark" ? "#B8860B20" : "#F9A82520",
                    },
                  ],
                hasData &&
                  !isToday &&
                  !isRamadan && {
                    backgroundColor:
                      colorScheme === "dark"
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.03)",
                  },
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  { color: colors.text },
                  isToday && styles.todayText,
                  !hasData && styles.emptyDayText,
                ]}
              >
                {day}
              </Text>
              {isRamadan && !isToday && (
                <Text style={styles.ramadanIcon}>🌙</Text>
              )}
              {hasData && !isToday && !isRamadan && (
                <View
                  style={[
                    styles.dataIndicator,
                    { backgroundColor: colors.tint },
                  ]}
                />
              )}
            </BlurView>
          )}
        </Pressable>
      );
    }

    return days;
  };

  return (
    <BlurView
      intensity={60}
      tint={colorScheme === "dark" ? "dark" : "light"}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface + "95",
          borderColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.04)",
        },
      ]}
    >
      {/* Week Days Header */}
      <View style={styles.weekDaysContainer}>
        {weekDays.map((day, index) => (
          <View key={`weekday-${index}`} style={styles.weekDayCell}>
            <Text
              style={[
                styles.weekDayText,
                { color: colors.text + "60" },
                (index === 0 || index === 6) && styles.weekendText,
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>{renderCalendarDays()}</View>

      {/* Helper Text */}
      <View
        style={[
          styles.helperTextContainer,
          { borderTopColor: colors.text + "10" },
        ]}
      >
        <Text style={[styles.helperText, { color: colors.text + "60" }]}>
          {t?.calendar?.tapToViewPrayerTimes || 'Tap any highlighted day to view prayer times'}
        </Text>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
  },

  weekDaysContainer: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },

  weekDayCell: {
    flex: 1,
    alignItems: "center",
  },

  weekDayText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.08,
  },

  weekendText: {
    opacity: 0.8,
  },

  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
  },

  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    padding: 3,
  },

  dayWithData: {
    cursor: "pointer",
  },

  emptyDataCell: {
    opacity: 0.4,
  },

  dayContent: {
    flex: 1,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  todayCell: {
    transform: [{ scale: 1.05 }],
  },

  todayContent: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },

  ramadanContent: {
    borderWidth: 1.5,
    borderColor: "#F9A825",
  },

  pressedCell: {
    transform: [{ scale: 0.95 }],
  },

  dayText: {
    fontSize: 17,
    fontWeight: "500",
    letterSpacing: -0.4,
  },

  todayText: {
    color: "#fff",
    fontWeight: "700",
  },

  emptyDayText: {
    opacity: 0.5,
  },

  ramadanIcon: {
    position: "absolute",
    top: 2,
    right: 4,
    fontSize: 10,
  },

  dataIndicator: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  helperTextContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  helperText: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: -0.08,
    textAlign: "center",
  },
});

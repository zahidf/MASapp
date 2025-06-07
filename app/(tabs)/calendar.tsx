import React, { useCallback, useState } from "react";
import { Modal, ScrollView, StyleSheet, TouchableOpacity } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DayDetail } from "@/components/prayer/DayDetail";
import { MonthlyCalendar } from "@/components/prayer/MonthlyCalendar";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { PrayerTime } from "@/types/prayer";
import { getMonthName } from "@/utils/dateHelpers";

export default function CalendarScreen() {
  const colorScheme = useColorScheme();
  const { prayerTimes } = usePrayerTimes();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDayData, setSelectedDayData] = useState<PrayerTime | null>(
    null
  );
  const [showDayDetail, setShowDayDetail] = useState(false);

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  const handleMonthChange = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const handleDaySelect = useCallback(
    (day: number) => {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;
      const dayData = prayerTimes.find((pt) => pt.d_date === dateStr);

      if (dayData) {
        setSelectedDayData(dayData);
        setShowDayDetail(true);
      }
    },
    [currentMonth, currentYear, prayerTimes]
  );

  const getMonthData = () => {
    const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-01`;
    const monthEnd = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-31`;

    return prayerTimes.filter(
      (pt) => pt.d_date >= monthStart && pt.d_date <= monthEnd
    );
  };

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Prayer Calendar
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.monthSelector}>
        <TouchableOpacity
          onPress={() => handleMonthChange("prev")}
          style={styles.monthButton}
        >
          <IconSymbol
            name="chevron.left"
            size={24}
            color={Colors[colorScheme ?? "light"].text}
          />
        </TouchableOpacity>

        <ThemedText style={styles.monthText}>
          {getMonthName(currentMonth)} {currentYear}
        </ThemedText>

        <TouchableOpacity
          onPress={() => handleMonthChange("next")}
          style={styles.monthButton}
        >
          <IconSymbol
            name="chevron.right"
            size={24}
            color={Colors[colorScheme ?? "light"].text}
          />
        </TouchableOpacity>
      </ThemedView>

      <MonthlyCalendar
        month={currentMonth}
        year={currentYear}
        monthData={getMonthData()}
        onDaySelect={handleDaySelect}
      />

      <Modal
        visible={showDayDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDayDetail(false)}
      >
        {selectedDayData && (
          <DayDetail
            prayerTime={selectedDayData}
            onClose={() => setShowDayDetail(false)}
          />
        )}
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
  },
  monthSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  monthButton: {
    padding: 10,
  },
  monthText: {
    fontSize: 20,
    fontWeight: "600",
  },
});

import { PrayerTime } from "@/types/prayer";
import { loadPrayerTimes } from "@/utils/storage";
import React, { createContext, ReactNode, useEffect, useState } from "react";

interface PrayerTimesContextType {
  prayerTimes: PrayerTime[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const PrayerTimesContext = createContext<PrayerTimesContextType | undefined>(
  undefined
);

export function PrayerTimesProvider({ children }: { children: ReactNode }) {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await loadPrayerTimes();
      setPrayerTimes(data);
    } catch (err) {
      setError("Failed to load prayer times");
      console.error("Error loading prayer times:", err);

      // Load some sample data as fallback
      setPrayerTimes(generateSampleData());
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    await loadData();
  };

  return (
    <PrayerTimesContext.Provider
      value={{
        prayerTimes,
        isLoading,
        error,
        refreshData,
      }}
    >
      {children}
    </PrayerTimesContext.Provider>
  );
}

export const usePrayerTimesContext = () => {
  const context = React.useContext(PrayerTimesContext);
  if (context === undefined) {
    throw new Error(
      "usePrayerTimesContext must be used within PrayerTimesProvider"
    );
  }
  return context;
};

// Generate sample data for the entire year
function generateSampleData(): PrayerTime[] {
  const data: PrayerTime[] = [];
  const year = 2025;

  // Sample times that will be adjusted slightly for each day
  const baseTimes = {
    fajr_begins: "06:00:00",
    fajr_jamah: "06:15:00",
    sunrise: "07:30:00",
    zuhr_begins: "12:30:00",
    zuhr_jamah: "13:00:00",
    asr_mithl_1: "15:00:00",
    asr_mithl_2: "15:30:00",
    asr_jamah: "15:45:00",
    maghrib_begins: "17:30:00",
    maghrib_jamah: "17:35:00",
    isha_begins: "19:00:00",
    isha_jamah: "19:30:00",
  };

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;

      // Add some variation to times based on month
      const timeAdjust = Math.floor((month - 6) * 5); // ±30 minutes variation

      data.push({
        d_date: dateStr,
        fajr_begins: adjustTime(baseTimes.fajr_begins, -timeAdjust),
        fajr_jamah: adjustTime(baseTimes.fajr_jamah, -timeAdjust),
        sunrise: adjustTime(baseTimes.sunrise, -timeAdjust),
        zuhr_begins: baseTimes.zuhr_begins,
        zuhr_jamah: baseTimes.zuhr_jamah,
        asr_mithl_1: adjustTime(baseTimes.asr_mithl_1, timeAdjust),
        asr_mithl_2: adjustTime(baseTimes.asr_mithl_2, timeAdjust),
        asr_jamah: adjustTime(baseTimes.asr_jamah, timeAdjust),
        maghrib_begins: adjustTime(baseTimes.maghrib_begins, timeAdjust),
        maghrib_jamah: adjustTime(baseTimes.maghrib_jamah, timeAdjust),
        isha_begins: adjustTime(baseTimes.isha_begins, timeAdjust),
        isha_jamah: adjustTime(baseTimes.isha_jamah, timeAdjust),
        is_ramadan:
          (month === 2 && day >= 10) || (month === 3 && day <= 9) ? 1 : 0,
        hijri_date: "",
      });
    }
  }

  return data;
}

function adjustTime(time: string, minutes: number): string {
  const [hours, mins, secs] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + mins + minutes;

  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;

  return `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(
    2,
    "0"
  )}:${String(secs).padStart(2, "0")}`;
}

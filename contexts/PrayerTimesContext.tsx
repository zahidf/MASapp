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
    console.log("PrayerTimesProvider: Starting initial data load");
    loadData();
  }, []);

  const loadData = async () => {
    console.log("PrayerTimesProvider: loadData called");
    setIsLoading(true);
    setError(null);

    try {
      const data = await loadPrayerTimes();
      console.log("PrayerTimesProvider: Loaded data length:", data?.length);

      // Ensure data is always an array
      const safeData = Array.isArray(data) ? data : [];
      setPrayerTimes(safeData);

      if (safeData.length === 0) {
        console.log("PrayerTimesProvider: No prayer times data available");
      }
    } catch (err) {
      console.error("PrayerTimesProvider: Error loading prayer times:", err);
      setError("Failed to load prayer times");
      setPrayerTimes([]); // Ensure we always have an array
    } finally {
      setIsLoading(false);
      console.log("PrayerTimesProvider: Data loading complete");
    }
  };

  const refreshData = async () => {
    console.log("PrayerTimesProvider: refreshData called");
    await loadData();
  };

  const contextValue = {
    prayerTimes,
    isLoading,
    error,
    refreshData,
  };

  return (
    <PrayerTimesContext.Provider value={contextValue}>
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

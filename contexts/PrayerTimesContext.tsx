import { PrayerTime } from "@/types/prayer";
import { firebasePrayerTimesService } from "@/services/firebasePrayerTimes";
import React, { createContext, ReactNode, useEffect, useState, useRef } from "react";

interface PrayerTimesContextType {
  prayerTimes: PrayerTime[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  isOnline: boolean;
}

const PrayerTimesContext = createContext<PrayerTimesContextType | undefined>(
  undefined
);

export function PrayerTimesProvider({ children }: { children: ReactNode }) {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const connectionUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Starting initial data load
    loadData();
    
    // Set up real-time updates from Firebase
    setupRealtimeUpdates();
    
    // Monitor connection status
    connectionUnsubscribeRef.current = firebasePrayerTimesService.monitorConnectionStatus((connected) => {
      setIsOnline(connected);
      // Connection status updated
    });

    return () => {
      // Clean up subscriptions
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (connectionUnsubscribeRef.current) {
        connectionUnsubscribeRef.current();
      }
    };
  }, []);

  const setupRealtimeUpdates = () => {
    // Subscribe to real-time updates from Firebase
    unsubscribeRef.current = firebasePrayerTimesService.subscribeToUpdates((updatedPrayerTimes) => {
      // Received real-time update
      setPrayerTimes(updatedPrayerTimes);
      // Firebase service handles caching automatically
    });
  };

  const loadData = async () => {
    // loadData called
    setIsLoading(true);
    setError(null);

    try {
      // Load from Firebase (it handles caching internally)
      const data = await firebasePrayerTimesService.getAllPrayerTimes();

      // Ensure data is always an array
      const safeData = Array.isArray(data) ? data : [];
      setPrayerTimes(safeData);

      if (safeData.length === 0) {
        // No prayer times data available
        setError("No prayer times data available. Please upload prayer times.");
      }
    } catch (err) {
      // Error loading prayer times
      setError("Failed to load prayer times");
      setPrayerTimes([]); // Ensure we always have an array
    } finally {
      setIsLoading(false);
      // Data loading complete
    }
  };

  const refreshData = async () => {
    // refreshData called
    await loadData();
  };

  const contextValue = {
    prayerTimes,
    isLoading,
    error,
    refreshData,
    isOnline,
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

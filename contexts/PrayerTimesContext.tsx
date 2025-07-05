import { PrayerTime } from "@/types/prayer";
import { loadPrayerTimes, savePrayerTimes } from "@/utils/storage";
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
    console.log("PrayerTimesProvider: Starting initial data load");
    loadData();
    
    // Set up real-time updates from Firebase
    setupRealtimeUpdates();
    
    // Monitor connection status
    connectionUnsubscribeRef.current = firebasePrayerTimesService.monitorConnectionStatus((connected) => {
      setIsOnline(connected);
      console.log("PrayerTimesProvider: Connection status:", connected ? "online" : "offline");
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
      console.log("PrayerTimesProvider: Received real-time update, length:", updatedPrayerTimes.length);
      setPrayerTimes(updatedPrayerTimes);
      
      // Also save to local storage for offline use
      savePrayerTimes(updatedPrayerTimes).catch(err => 
        console.error("Error saving to local storage:", err)
      );
    });
  };

  const loadData = async () => {
    console.log("PrayerTimesProvider: loadData called");
    setIsLoading(true);
    setError(null);

    try {
      // Try to load from Firebase first
      let data: PrayerTime[] = [];
      let loadedFromFirebase = false;
      
      try {
        const isConnected = await firebasePrayerTimesService.isConnected();
        if (isConnected) {
          console.log("PrayerTimesProvider: Loading from Firebase");
          data = await firebasePrayerTimesService.getAllPrayerTimes();
          loadedFromFirebase = true;
          
          // Save to local storage for offline use
          if (data.length > 0) {
            await savePrayerTimes(data);
          }
        }
      } catch (firebaseError) {
        console.log("PrayerTimesProvider: Firebase load failed, falling back to local storage");
      }
      
      // If Firebase load failed or returned no data, try local storage
      if (!loadedFromFirebase || data.length === 0) {
        console.log("PrayerTimesProvider: Loading from local storage");
        const localData = await loadPrayerTimes();
        if (localData && localData.length > 0) {
          data = localData;
        }
      }

      console.log("PrayerTimesProvider: Loaded data length:", data?.length);

      // Ensure data is always an array
      const safeData = Array.isArray(data) ? data : [];
      setPrayerTimes(safeData);

      if (safeData.length === 0) {
        console.log("PrayerTimesProvider: No prayer times data available");
        setError("No prayer times data available. Please upload prayer times.");
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

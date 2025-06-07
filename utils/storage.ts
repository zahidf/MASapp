import AsyncStorage from "@react-native-async-storage/async-storage";
import { PrayerTime } from "../types/prayer";
import { generateCSVContent, parseYearlyCSV } from "./csvParser";

const STORAGE_KEYS = {
  PRAYER_TIMES: "@prayer_times_csv",
  USER_DATA: "@user_data",
  LAST_UPDATE: "@last_update",
};

export const savePrayerTimes = async (data: PrayerTime[]): Promise<void> => {
  try {
    const csvContent = generateCSVContent(data);
    await AsyncStorage.setItem(STORAGE_KEYS.PRAYER_TIMES, csvContent);
    await AsyncStorage.setItem(
      STORAGE_KEYS.LAST_UPDATE,
      new Date().toISOString()
    );
  } catch (error) {
    console.error("Error saving prayer times:", error);
    throw new Error("Failed to save prayer times");
  }
};

export const loadPrayerTimes = async (): Promise<PrayerTime[]> => {
  try {
    const csvContent = await AsyncStorage.getItem(STORAGE_KEYS.PRAYER_TIMES);

    if (!csvContent) {
      // Load from bundled asset if no stored data
      const bundledData = await loadBundledData();
      await savePrayerTimes(bundledData);
      return bundledData;
    }

    return parseYearlyCSV(csvContent);
  } catch (error) {
    console.error("Error loading prayer times:", error);
    throw new Error("Failed to load prayer times");
  }
};

export const loadBundledData = async (): Promise<PrayerTime[]> => {
  try {
    // In a real app, this would load from a bundled CSV file
    // For now, returning sample data
    const sampleData: PrayerTime[] = [
      {
        d_date: "2025-01-01",
        fajr_begins: "06:46:00",
        fajr_jamah: "07:00:00",
        sunrise: "08:18:00",
        zuhr_begins: "12:16:00",
        zuhr_jamah: "13:00:00",
        asr_mithl_1: "14:18:00",
        asr_mithl_2: "14:18:00",
        asr_jamah: "14:30:00",
        maghrib_begins: "16:04:00",
        maghrib_jamah: "16:04:00",
        isha_begins: "17:44:00",
        isha_jamah: "19:00:00",
        is_ramadan: 0,
        hijri_date: "0",
      },
      // Add more sample data as needed
    ];

    return sampleData;
  } catch (error) {
    console.error("Error loading bundled data:", error);
    throw new Error("Failed to load bundled data");
  }
};

export const getLastUpdateTime = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.LAST_UPDATE);
  } catch {
    return null;
  }
};

export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.PRAYER_TIMES,
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.LAST_UPDATE,
    ]);
  } catch (error) {
    console.error("Error clearing data:", error);
    throw new Error("Failed to clear data");
  }
};

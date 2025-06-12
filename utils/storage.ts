import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import { PrayerTime } from "../types/prayer";
import { generateCSVContent, parseYearlyCSV } from "./csvParser";

const STORAGE_KEYS = {
  PRAYER_TIMES: "@prayer_times_csv",
  USER_DATA: "@user_data",
  LAST_UPDATE: "@last_update",
};

export const savePrayerTimes = async (data: PrayerTime[]): Promise<void> => {
  console.log("savePrayerTimes called with", data?.length, "items");

  try {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn("No valid data to save");
      return;
    }

    const csvContent = generateCSVContent(data);

    if (!csvContent || csvContent.trim() === "") {
      console.warn("Generated CSV content is empty");
      return;
    }

    await AsyncStorage.setItem(STORAGE_KEYS.PRAYER_TIMES, csvContent);
    await AsyncStorage.setItem(
      STORAGE_KEYS.LAST_UPDATE,
      new Date().toISOString()
    );

    console.log("Prayer times saved successfully");
  } catch (error) {
    console.error("Error saving prayer times:", error);
    throw new Error("Failed to save prayer times");
  }
};

export const loadPrayerTimes = async (): Promise<PrayerTime[]> => {
  console.log("loadPrayerTimes called");

  try {
    // First try to load from AsyncStorage (user uploaded data)
    const csvContent = await AsyncStorage.getItem(STORAGE_KEYS.PRAYER_TIMES);
    console.log(
      "Loaded CSV content from storage:",
      typeof csvContent,
      csvContent?.length
    );

    if (
      csvContent &&
      typeof csvContent === "string" &&
      csvContent.trim() !== ""
    ) {
      const parsedData = parseYearlyCSV(csvContent);
      console.log("Parsed data from storage:", parsedData?.length);

      if (Array.isArray(parsedData) && parsedData.length > 0) {
        return parsedData;
      }
    }

    // If no stored data, try to load from bundled CSV file
    console.log(
      "No stored data found, attempting to load from bundled CSV file"
    );
    const bundledData = await loadBundledCSV();

    // Save the bundled data to storage for faster access next time
    if (bundledData.length > 0) {
      await savePrayerTimes(bundledData);
    }

    return bundledData;
  } catch (error) {
    console.error("Error loading prayer times:", error);
    return [];
  }
};

export const loadBundledCSV = async (): Promise<PrayerTime[]> => {
  console.log("loadBundledCSV called");

  try {
    // Try to load the CSV file from assets
    let asset: Asset;

    try {
      asset = Asset.fromModule(require("../assets/mobilePrayerTimes.csv"));
    } catch (requireError) {
      const errorMessage =
        requireError instanceof Error
          ? requireError.message
          : "Unknown require error";
      console.warn("CSV file not found in assets:", errorMessage);
      console.log("Falling back to sample data due to missing CSV file");
      return generateFallbackData();
    }

    await asset.downloadAsync();
    console.log("Asset downloaded, localUri:", asset.localUri);

    if (!asset.localUri) {
      throw new Error("Could not get local URI for CSV asset");
    }

    // Check if file exists and is readable
    const fileInfo = await FileSystem.getInfoAsync(asset.localUri);
    if (!fileInfo.exists) {
      throw new Error("CSV file does not exist at local URI");
    }

    // Read the file content
    const csvContent = await FileSystem.readAsStringAsync(asset.localUri);
    console.log(
      "CSV content loaded from file:",
      typeof csvContent,
      csvContent?.length
    );

    if (!csvContent || csvContent.trim() === "") {
      console.warn("CSV file is empty");
      return generateFallbackData();
    }

    // Parse the CSV content
    const parsedData = parseYearlyCSV(csvContent);
    console.log("Parsed bundled data:", parsedData?.length);

    return Array.isArray(parsedData) ? parsedData : [];
  } catch (error) {
    console.error("Error loading bundled CSV:", error);

    // Fallback to generate sample data if bundled file fails
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.log("Falling back to sample data due to error:", errorMessage);
    return generateFallbackData();
  }
};

export const generateFallbackData = (): PrayerTime[] => {
  console.log("Generating fallback data");

  // Generate data for the current month as fallback
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const data: PrayerTime[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    // Generate realistic prayer times that vary slightly day by day
    const baseHour = 6;
    const fajrMinutes = Math.max(0, 30 - day); // Gradually earlier
    const sunriseMinutes = Math.max(0, 60 + day * 2); // Gradually later

    data.push({
      d_date: dateStr,
      fajr_begins: `${String(baseHour).padStart(2, "0")}:${String(
        fajrMinutes
      ).padStart(2, "0")}:00`,
      fajr_jamah: `${String(baseHour).padStart(2, "0")}:${String(
        Math.min(59, fajrMinutes + 15)
      ).padStart(2, "0")}:00`,
      sunrise: `${String(7).padStart(2, "0")}:${String(
        Math.min(59, sunriseMinutes)
      ).padStart(2, "0")}:00`,
      zuhr_begins: "12:30:00",
      zuhr_jamah: "13:00:00",
      asr_mithl_1: "15:00:00",
      asr_mithl_2: "15:00:00",
      asr_jamah: "15:15:00",
      maghrib_begins: `${String(17 + Math.floor(day / 10)).padStart(
        2,
        "0"
      )}:${String(30 + (day % 10) * 2).padStart(2, "0")}:00`,
      maghrib_jamah: `${String(17 + Math.floor(day / 10)).padStart(
        2,
        "0"
      )}:${String(35 + (day % 10) * 2).padStart(2, "0")}:00`,
      isha_begins: "19:00:00",
      isha_jamah: "19:30:00",
      is_ramadan: 0,
      hijri_date: "",
    });
  }

  console.log("Generated fallback data for", data.length, "days");
  return data;
};

export const getLastUpdateTime = async (): Promise<string | null> => {
  try {
    const lastUpdate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_UPDATE);
    return lastUpdate;
  } catch (error) {
    console.error("Error getting last update time:", error);
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
    console.log("All data cleared successfully");
  } catch (error) {
    console.error("Error clearing data:", error);
    throw new Error("Failed to clear data");
  }
};

// Helper function to force reload from bundled CSV (useful for testing)
export const reloadFromBundledCSV = async (): Promise<PrayerTime[]> => {
  console.log("Forcing reload from bundled CSV");

  try {
    const bundledData = await loadBundledCSV();

    if (bundledData.length > 0) {
      await savePrayerTimes(bundledData);
    }

    return bundledData;
  } catch (error) {
    console.error("Error reloading from bundled CSV:", error);
    return [];
  }
};

// Helper function to check if storage is working
export const testStorage = async (): Promise<boolean> => {
  try {
    const testKey = "@test_key";
    const testValue = "test_value";

    await AsyncStorage.setItem(testKey, testValue);
    const retrievedValue = await AsyncStorage.getItem(testKey);
    await AsyncStorage.removeItem(testKey);

    return retrievedValue === testValue;
  } catch (error) {
    console.error("Storage test failed:", error);
    return false;
  }
};

// Helper function to check if CSV file exists in assets
export const checkCSVFileExists = async (): Promise<boolean> => {
  try {
    const asset = Asset.fromModule(require("../assets/mobilePrayerTimes.csv"));
    await asset.downloadAsync();

    if (!asset.localUri) {
      return false;
    }

    const fileInfo = await FileSystem.getInfoAsync(asset.localUri);
    return fileInfo.exists;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.log("CSV file check failed:", errorMessage);
    return false;
  }
};

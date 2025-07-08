import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import { PrayerTime } from "../types/prayer";
import { generateCSVContent, parseYearlyCSV } from "./csvParser";
import { firebaseLogger, LogCategory, logFirebaseOperation } from "./firebaseLogger";

const STORAGE_KEYS = {
  PRAYER_TIMES: "@prayer_times_csv",
  USER_DATA: "@user_data",
  LAST_UPDATE: "@last_update",
};

export const savePrayerTimes = async (data: PrayerTime[]): Promise<void> => {
  return logFirebaseOperation(
    LogCategory.STORAGE,
    'savePrayerTimes',
    async () => {
      firebaseLogger.debug(
        LogCategory.STORAGE,
        'savePrayerTimes',
        `Saving ${data?.length || 0} prayer times to storage`
      );

      if (!data || !Array.isArray(data) || data.length === 0) {
        firebaseLogger.warn(
          LogCategory.STORAGE,
          'savePrayerTimes',
          'No valid data to save',
          { dataType: typeof data, isArray: Array.isArray(data), length: data?.length }
        );
        return;
      }

      const perfId = firebaseLogger.startPerformanceTracking('generate_csv_content');
      const csvContent = generateCSVContent(data);
      firebaseLogger.endPerformanceTracking(perfId, true, { contentLength: csvContent?.length });

      if (!csvContent || csvContent.trim() === "") {
        firebaseLogger.warn(
          LogCategory.STORAGE,
          'savePrayerTimes',
          'Generated CSV content is empty'
        );
        return;
      }

      const storagePerfId = firebaseLogger.startPerformanceTracking('async_storage_save');
      await AsyncStorage.setItem(STORAGE_KEYS.PRAYER_TIMES, csvContent);
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_UPDATE,
        new Date().toISOString()
      );
      firebaseLogger.endPerformanceTracking(storagePerfId, true);

      firebaseLogger.info(
        LogCategory.STORAGE,
        'savePrayerTimes',
        'Prayer times saved successfully',
        { 
          itemCount: data.length,
          csvSize: csvContent.length,
          firstDate: data[0]?.d_date,
          lastDate: data[data.length - 1]?.d_date 
        }
      );
    }
  );
};

export const loadPrayerTimes = async (): Promise<PrayerTime[]> => {
  return logFirebaseOperation(
    LogCategory.STORAGE,
    'loadPrayerTimes',
    async () => {
      firebaseLogger.debug(
        LogCategory.STORAGE,
        'loadPrayerTimes',
        'Loading prayer times from storage'
      );

      // First try to load from AsyncStorage (user uploaded data)
      const perfId = firebaseLogger.startPerformanceTracking('async_storage_load');
      const csvContent = await AsyncStorage.getItem(STORAGE_KEYS.PRAYER_TIMES);
      firebaseLogger.endPerformanceTracking(perfId, true, { contentLength: csvContent?.length });

      firebaseLogger.debug(
        LogCategory.STORAGE,
        'loadPrayerTimes',
        'Loaded CSV content from storage',
        { contentType: typeof csvContent, contentLength: csvContent?.length }
      );

      if (
        csvContent &&
        typeof csvContent === "string" &&
        csvContent.trim() !== ""
      ) {
        const parsePerfId = firebaseLogger.startPerformanceTracking('parse_csv_content');
        const parsedData = parseYearlyCSV(csvContent);
        firebaseLogger.endPerformanceTracking(parsePerfId, true, { itemCount: parsedData?.length });

        firebaseLogger.info(
          LogCategory.STORAGE,
          'loadPrayerTimes',
          'Parsed data from storage',
          { itemCount: parsedData?.length }
        );

        if (Array.isArray(parsedData) && parsedData.length > 0) {
          return parsedData;
        }
      }

      // If no stored data, try to load from bundled CSV file
      firebaseLogger.info(
        LogCategory.STORAGE,
        'loadPrayerTimes',
        'No stored data found, attempting to load from bundled CSV file'
      );
      
      const bundledData = await loadBundledCSV();

      // Save the bundled data to storage for faster access next time
      if (bundledData.length > 0) {
        firebaseLogger.debug(
          LogCategory.STORAGE,
          'loadPrayerTimes',
          'Saving bundled data to storage for future use'
        );
        await savePrayerTimes(bundledData);
      }

      return bundledData;
    }
  ).catch((error) => {
    firebaseLogger.error(
      LogCategory.STORAGE,
      'loadPrayerTimes',
      'Failed to load prayer times',
      error
    );
    return [];
  });
};

export const loadBundledCSV = async (): Promise<PrayerTime[]> => {
  return logFirebaseOperation(
    LogCategory.STORAGE,
    'loadBundledCSV',
    async () => {
      firebaseLogger.debug(
        LogCategory.STORAGE,
        'loadBundledCSV',
        'Loading bundled CSV file from assets'
      );

      // Try to load the CSV file from assets
      let asset: Asset;

      try {
        asset = Asset.fromModule(require("../assets/mobilePrayerTimes.csv"));
        firebaseLogger.debug(
          LogCategory.STORAGE,
          'loadBundledCSV',
          'CSV asset module loaded successfully'
        );
      } catch (requireError) {
        const errorMessage =
          requireError instanceof Error
            ? requireError.message
            : "Unknown require error";
        firebaseLogger.warn(
          LogCategory.STORAGE,
          'loadBundledCSV',
          'CSV file not found in assets, using fallback data',
          { error: errorMessage }
        );
        return generateFallbackData();
      }

      const downloadPerfId = firebaseLogger.startPerformanceTracking('asset_download');
      await asset.downloadAsync();
      firebaseLogger.endPerformanceTracking(downloadPerfId, true);
      
      firebaseLogger.debug(
        LogCategory.STORAGE,
        'loadBundledCSV',
        'Asset downloaded',
        { localUri: asset.localUri }
      );

      if (!asset.localUri) {
        const error = new Error("Could not get local URI for CSV asset");
        firebaseLogger.error(
          LogCategory.STORAGE,
          'loadBundledCSV',
          error.message,
          error
        );
        throw error;
      }

      // Check if file exists and is readable
      const fileInfo = await FileSystem.getInfoAsync(asset.localUri);
      if (!fileInfo.exists) {
        const error = new Error("CSV file does not exist at local URI");
        firebaseLogger.error(
          LogCategory.STORAGE,
          'loadBundledCSV',
          error.message,
          error,
          { localUri: asset.localUri }
        );
        throw error;
      }

      // Read the file content
      const readPerfId = firebaseLogger.startPerformanceTracking('file_read');
      const csvContent = await FileSystem.readAsStringAsync(asset.localUri);
      firebaseLogger.endPerformanceTracking(readPerfId, true, { contentLength: csvContent?.length });

      firebaseLogger.debug(
        LogCategory.STORAGE,
        'loadBundledCSV',
        'CSV content loaded from file',
        { contentType: typeof csvContent, contentLength: csvContent?.length }
      );

      if (!csvContent || csvContent.trim() === "") {
        firebaseLogger.warn(
          LogCategory.STORAGE,
          'loadBundledCSV',
          'CSV file is empty, using fallback data'
        );
        return generateFallbackData();
      }

      // Parse the CSV content
      const parsePerfId = firebaseLogger.startPerformanceTracking('parse_bundled_csv');
      const parsedData = parseYearlyCSV(csvContent);
      firebaseLogger.endPerformanceTracking(parsePerfId, true, { itemCount: parsedData?.length });

      firebaseLogger.info(
        LogCategory.STORAGE,
        'loadBundledCSV',
        'Successfully parsed bundled CSV data',
        { itemCount: parsedData?.length }
      );

      return Array.isArray(parsedData) ? parsedData : [];
    }
  ).catch((error) => {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    firebaseLogger.error(
      LogCategory.STORAGE,
      'loadBundledCSV',
      'Failed to load bundled CSV, using fallback data',
      error
    );
    return generateFallbackData();
  });
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
  return logFirebaseOperation(
    LogCategory.STORAGE,
    'clearAllData',
    async () => {
      firebaseLogger.warn(
        LogCategory.STORAGE,
        'clearAllData',
        'Clearing all stored data'
      );

      const perfId = firebaseLogger.startPerformanceTracking('clear_all_data');
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.PRAYER_TIMES,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.LAST_UPDATE,
      ]);
      firebaseLogger.endPerformanceTracking(perfId, true);

      firebaseLogger.info(
        LogCategory.STORAGE,
        'clearAllData',
        'All data cleared successfully',
        { clearedKeys: Object.values(STORAGE_KEYS) }
      );
    }
  );
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
  return logFirebaseOperation(
    LogCategory.STORAGE,
    'testStorage',
    async () => {
      const testKey = "@test_key";
      const testValue = "test_value";

      firebaseLogger.debug(
        LogCategory.STORAGE,
        'testStorage',
        'Running storage test'
      );

      const perfId = firebaseLogger.startPerformanceTracking('storage_test');
      
      await AsyncStorage.setItem(testKey, testValue);
      const retrievedValue = await AsyncStorage.getItem(testKey);
      await AsyncStorage.removeItem(testKey);
      
      const testPassed = retrievedValue === testValue;
      firebaseLogger.endPerformanceTracking(perfId, testPassed);

      firebaseLogger.info(
        LogCategory.STORAGE,
        'testStorage',
        `Storage test ${testPassed ? 'passed' : 'failed'}`,
        { testPassed, retrievedValue, expectedValue: testValue }
      );

      return testPassed;
    }
  ).catch((error) => {
    firebaseLogger.error(
      LogCategory.STORAGE,
      'testStorage',
      'Storage test failed with error',
      error
    );
    return false;
  });
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

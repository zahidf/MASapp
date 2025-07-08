import { MonthlyUploadRow, PrayerTime } from "../types/prayer";

export const parseYearlyCSV = (
  csvContent: string | null | undefined
): PrayerTime[] => {
  // Removed console.log for production

  // Handle all possible invalid inputs
  if (
    !csvContent ||
    typeof csvContent !== "string" ||
    csvContent.trim() === ""
  ) {
    // Invalid or empty CSV content
    return [];
  }

  try {
    const trimmedContent = csvContent.trim();

    // Split into lines and filter out empty ones
    const allLines = trimmedContent.split(/\r?\n/);
    const lines = allLines.filter((line) => {
      return line && typeof line === "string" && line.trim().length > 0;
    });

    // Total lines after filtering

    if (lines.length < 2) {
      // Not enough lines in CSV (need header + data)
      return [];
    }

    // Parse header
    const headerLine = lines[0];
    if (!headerLine || typeof headerLine !== "string") {
      // Invalid header line
      return [];
    }

    const headers = headerLine.split(",").map((h) => (h ? h.trim() : ""));
    // Headers parsed

    // Parse data lines
    const dataLines = lines.slice(1);
    const results: PrayerTime[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const lineNumber = i + 2; // +2 for header and 0-based index

      if (!line || typeof line !== "string") {
        // Line is invalid
        continue;
      }

      try {
        const values = line.split(",").map((v) => (v ? v.trim() : ""));
        const prayerTime: any = {};

        // Map values to headers
        headers.forEach((header, headerIndex) => {
          const value = values[headerIndex] || "";

          if (header === "is_ramadan") {
            prayerTime[header] = parseInt(value) || 0;
          } else {
            prayerTime[header] = value;
          }
        });

        // Create the prayer time object with safe defaults
        const result: PrayerTime = {
          d_date: prayerTime.d_date || "",
          fajr_begins: formatTime(prayerTime.fajr_begins),
          fajr_jamah: formatTime(prayerTime.fajr_jamah),
          sunrise: formatTime(prayerTime.sunrise),
          zuhr_begins: formatTime(prayerTime.zuhr_begins),
          zuhr_jamah: formatTime(prayerTime.zuhr_jamah),
          asr_mithl_1: formatTime(prayerTime.asr_mithl_1),
          asr_mithl_2: formatTime(prayerTime.asr_mithl_2),
          asr_jamah: formatTime(prayerTime.asr_jamah),
          maghrib_begins: formatTime(prayerTime.maghrib_begins),
          maghrib_jamah: formatTime(prayerTime.maghrib_jamah),
          isha_begins: formatTime(prayerTime.isha_begins),
          isha_jamah: formatTime(prayerTime.isha_jamah),
          is_ramadan: prayerTime.is_ramadan || 0,
          hijri_date: prayerTime.hijri_date || "",
        };

        // Only add if we have a valid date
        if (result.d_date && result.d_date.length > 0) {
          results.push(result);
        }
      } catch (lineError) {
        // Error parsing line
        continue;
      }
    }

    // Successfully parsed prayer times
    return results;
  } catch (error) {
    // Error in parseYearlyCSV
    return [];
  }
};

export const parseMonthlyCSV = (
  csvContent: string | null | undefined
): MonthlyUploadRow[] => {
  // Removed console.log for production

  if (
    !csvContent ||
    typeof csvContent !== "string" ||
    csvContent.trim() === ""
  ) {
    // Invalid or empty CSV content
    return [];
  }

  try {
    const trimmedContent = csvContent.trim();
    const allLines = trimmedContent.split(/\r?\n/);
    const lines = allLines.filter((line) => {
      return line && typeof line === "string" && line.trim().length > 0;
    });

    if (lines.length < 2) {
      // Not enough lines in CSV (need header + data)
      return [];
    }

    const headerLine = lines[0];
    if (!headerLine || typeof headerLine !== "string") {
      // Invalid header line
      return [];
    }

    const headers = headerLine.split(",").map((h) => (h ? h.trim() : ""));
    const dataLines = lines.slice(1);
    const results: MonthlyUploadRow[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const lineNumber = i + 2;

      if (!line || typeof line !== "string") {
        // Line is invalid
        continue;
      }

      try {
        const values = line.split(",").map((v) => (v ? v.trim() : ""));
        const row: any = {};

        headers.forEach((header, headerIndex) => {
          const value = values[headerIndex] || "";

          if (header === "day") {
            row[header] = parseInt(value) || 0;
          } else {
            row[header] = value;
          }
        });

        // Only add if we have a valid day
        if (row.day && row.day > 0 && row.day <= 31) {
          results.push(row as MonthlyUploadRow);
        }
      } catch (lineError) {
        // Error parsing line
        continue;
      }
    }

    // Successfully parsed monthly rows
    return results;
  } catch (error) {
    // Error in parseMonthlyCSV
    return [];
  }
};

export const formatTime = (time: string | null | undefined): string => {
  // Handle all possible invalid inputs
  if (!time || typeof time !== "string" || time.trim() === "") {
    return "00:00:00";
  }

  try {
    const trimmedTime = time.trim();

    // Check if it's already in HH:MM:SS format
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmedTime)) {
      const parts = trimmedTime.split(":");
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(
        2,
        "0"
      )}:${parts[2].padStart(2, "0")}`;
    }

    // Check if it's in HH:MM format
    if (/^\d{1,2}:\d{2}$/.test(trimmedTime)) {
      const parts = trimmedTime.split(":");
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:00`;
    }

    // If it doesn't match expected formats, return default
    // Invalid time format
    return "00:00:00";
  } catch (error) {
    // Error formatting time
    return "00:00:00";
  }
};

export const validateYearlyData = (
  data: PrayerTime[]
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || !Array.isArray(data) || data.length === 0) {
    errors.push("No data found in CSV");
    return { isValid: false, errors, warnings };
  }

  // Check for required fields
  const requiredFields = [
    "d_date",
    "fajr_begins",
    "zuhr_begins",
    "asr_mithl_1",
    "maghrib_begins",
    "isha_begins",
  ];

  data.forEach((row, index) => {
    if (!row || typeof row !== "object") {
      errors.push(`Row ${index + 1}: Invalid row data`);
      return;
    }

    const lineNum = index + 2; // +2 because of header and 0-based index

    // Check date format
    if (!row.d_date || !row.d_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errors.push(
        `Line ${lineNum}: Invalid date format (${row.d_date}). Expected YYYY-MM-DD`
      );
    }

    // Check required prayer times
    requiredFields.forEach((field) => {
      const value = row[field as keyof PrayerTime];
      if (!value || (typeof value === "string" && value.trim() === "")) {
        errors.push(`Line ${lineNum}: Missing required field '${field}'`);
      }
    });

    // Validate time formats
    const timeFields = [
      "fajr_begins",
      "fajr_jamah",
      "sunrise",
      "zuhr_begins",
      "zuhr_jamah",
      "asr_mithl_1",
      "asr_mithl_2",
      "asr_jamah",
      "maghrib_begins",
      "maghrib_jamah",
      "isha_begins",
      "isha_jamah",
    ];

    timeFields.forEach((field) => {
      const time = row[field as keyof PrayerTime] as string;
      if (time && time.trim() !== "" && !time.match(/^\d{2}:\d{2}:\d{2}$/)) {
        warnings.push(
          `Line ${lineNum}: Time format for '${field}' should be HH:MM:SS (found: ${time})`
        );
      }
    });
  });

  // Check for date continuity and duplicates
  const dates = data.map((row) => row.d_date).filter(Boolean);
  const uniqueDates = new Set(dates);

  if (dates.length !== uniqueDates.size) {
    errors.push("Duplicate dates found in data");
  }

  // Check if it looks like a full year (should be 365 or 366 days)
  if (data.length < 300) {
    warnings.push(
      `Data contains only ${data.length} days. Expected ~365 days for a full year.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

export const mergeMonthlyIntoYearly = (
  yearlyData: PrayerTime[],
  monthlyData: MonthlyUploadRow[],
  year: number,
  month: number
): PrayerTime[] => {
  if (!Array.isArray(yearlyData)) {
    yearlyData = [];
  }

  if (!Array.isArray(monthlyData) || monthlyData.length === 0) {
    return yearlyData;
  }

  const updatedData = [...yearlyData];

  monthlyData.forEach((row) => {
    if (!row || typeof row !== "object" || !row.day) {
      return;
    }

    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      row.day
    ).padStart(2, "0")}`;
    const existingIndex = updatedData.findIndex(
      (prayer) => prayer.d_date === dateStr
    );

    const newPrayerTime: PrayerTime = {
      d_date: dateStr,
      fajr_begins: formatTime(row.fajr_begins),
      fajr_jamah: formatTime(row.fajr_jamah),
      sunrise: formatTime(row.sunrise),
      zuhr_begins: formatTime(row.zuhr_begins),
      zuhr_jamah: formatTime(row.zuhr_jamah),
      asr_mithl_1: formatTime(row.asr_mithl_1),
      asr_mithl_2: formatTime(row.asr_mithl_2),
      asr_jamah: formatTime(row.asr_jamah),
      maghrib_begins: formatTime(row.maghrib_begins),
      maghrib_jamah: formatTime(row.maghrib_jamah),
      isha_begins: formatTime(row.isha_begins),
      isha_jamah: formatTime(row.isha_jamah),
      is_ramadan: 0, // Default, can be updated based on date
      hijri_date: "", // To be calculated separately
    };

    if (existingIndex !== -1) {
      updatedData[existingIndex] = newPrayerTime;
    } else {
      // Insert in correct position to maintain date order
      const insertIndex = updatedData.findIndex(
        (prayer) => prayer.d_date > dateStr
      );

      if (insertIndex === -1) {
        updatedData.push(newPrayerTime);
      } else {
        updatedData.splice(insertIndex, 0, newPrayerTime);
      }
    }
  });

  return updatedData;
};

export const generateCSVContent = (data: PrayerTime[]): string => {
  if (!Array.isArray(data) || data.length === 0) {
    return "";
  }

  const headers = [
    "d_date",
    "fajr_begins",
    "fajr_jamah",
    "sunrise",
    "zuhr_begins",
    "zuhr_jamah",
    "asr_mithl_1",
    "asr_mithl_2",
    "asr_jamah",
    "maghrib_begins",
    "maghrib_jamah",
    "isha_begins",
    "isha_jamah",
    "is_ramadan",
    "hijri_date",
  ];

  const csvLines = [headers.join(",")];

  data.forEach((row) => {
    if (!row || typeof row !== "object") {
      return;
    }

    const values = headers.map((header) => {
      const value = row[header as keyof PrayerTime];
      return value !== undefined && value !== null ? String(value) : "";
    });
    csvLines.push(values.join(","));
  });

  return csvLines.join("\n");
};

export const generateMonthlyCSVContent = (data: PrayerTime[], year: number, month: number): string => {
  if (!Array.isArray(data) || data.length === 0) {
    return "";
  }

  // Filter data for the specific month
  const monthStr = String(month).padStart(2, "0");
  const yearStr = String(year);
  const monthlyData = data.filter((row) => {
    if (!row.d_date) return false;
    const [rowYear, rowMonth] = row.d_date.split("-");
    return rowYear === yearStr && rowMonth === monthStr;
  });

  if (monthlyData.length === 0) {
    return "";
  }

  // Monthly CSV headers (without d_date, using day instead)
  const headers = [
    "day",
    "fajr_begins",
    "fajr_jamah",
    "sunrise",
    "zuhr_begins",
    "zuhr_jamah",
    "asr_mithl_1",
    "asr_mithl_2",
    "asr_jamah",
    "maghrib_begins",
    "maghrib_jamah",
    "isha_begins",
    "isha_jamah",
  ];

  const csvLines = [headers.join(",")];

  monthlyData.forEach((row) => {
    if (!row || typeof row !== "object") {
      return;
    }

    // Extract day from date
    const day = row.d_date.split("-")[2];
    
    const values = [
      day,
      row.fajr_begins || "",
      row.fajr_jamah || "",
      row.sunrise || "",
      row.zuhr_begins || "",
      row.zuhr_jamah || "",
      row.asr_mithl_1 || "",
      row.asr_mithl_2 || "",
      row.asr_jamah || "",
      row.maghrib_begins || "",
      row.maghrib_jamah || "",
      row.isha_begins || "",
      row.isha_jamah || "",
    ];
    csvLines.push(values.join(","));
  });

  return csvLines.join("\n");
};

// Alias for compatibility with migration scripts
export const parsePrayerTimesFromCSV = parseYearlyCSV;

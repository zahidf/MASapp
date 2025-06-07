import { MonthlyUploadRow, PrayerTime } from "../types/prayer";

export const parseYearlyCSV = (csvContent: string): PrayerTime[] => {
  const lines = csvContent.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const prayerTime: any = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim() || "";

      if (header === "is_ramadan") {
        prayerTime[header] = parseInt(value) || 0;
      } else {
        prayerTime[header] = value;
      }
    });

    // Ensure all required fields exist with defaults
    return {
      d_date: prayerTime.d_date || "",
      fajr_begins: formatTime(prayerTime.fajr_begins || ""),
      fajr_jamah: formatTime(prayerTime.fajr_jamah || ""),
      sunrise: formatTime(prayerTime.sunrise || ""),
      zuhr_begins: formatTime(prayerTime.zuhr_begins || ""),
      zuhr_jamah: formatTime(prayerTime.zuhr_jamah || ""),
      asr_mithl_1: formatTime(prayerTime.asr_mithl_1 || ""),
      asr_mithl_2: formatTime(prayerTime.asr_mithl_2 || ""),
      asr_jamah: formatTime(prayerTime.asr_jamah || ""),
      maghrib_begins: formatTime(prayerTime.maghrib_begins || ""),
      maghrib_jamah: formatTime(prayerTime.maghrib_jamah || ""),
      isha_begins: formatTime(prayerTime.isha_begins || ""),
      isha_jamah: formatTime(prayerTime.isha_jamah || ""),
      is_ramadan: prayerTime.is_ramadan || 0,
      hijri_date: prayerTime.hijri_date || "",
    } as PrayerTime;
  });
};

export const parseMonthlyCSV = (csvContent: string): MonthlyUploadRow[] => {
  const lines = csvContent.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: any = {};

    headers.forEach((header, index) => {
      if (header === "day") {
        row[header] = parseInt(values[index]?.trim() || "0");
      } else {
        row[header] = values[index]?.trim() || "";
      }
    });

    return row as MonthlyUploadRow;
  });
};

export const formatTime = (time: string): string => {
  // Ensure time is in HH:MM:SS format
  if (!time) return "00:00:00";

  const parts = time.split(":");
  if (parts.length === 2) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:00`;
  } else if (parts.length === 3) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(
      2,
      "0"
    )}:${parts[2].padStart(2, "0")}`;
  }

  return "00:00:00";
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

  if (data.length === 0) {
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
    const lineNum = index + 2; // +2 because of header and 0-based index

    // Check date format
    if (!row.d_date || !row.d_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errors.push(
        `Line ${lineNum}: Invalid date format (${row.d_date}). Expected YYYY-MM-DD`
      );
    }

    // Check required prayer times
    requiredFields.forEach((field) => {
      if (!row[field as keyof PrayerTime]) {
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
      if (time && !time.match(/^\d{2}:\d{2}:\d{2}$/)) {
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
  const updatedData = [...yearlyData];

  monthlyData.forEach((row) => {
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
    const values = headers.map((header) => row[header as keyof PrayerTime]);
    csvLines.push(values.join(","));
  });

  return csvLines.join("\n");
};

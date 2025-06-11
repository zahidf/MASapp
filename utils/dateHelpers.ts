import { Prayer, PrayerName, PrayerTime } from "../types/prayer";

export const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getTodayString = (): string => {
  return formatDateString(new Date());
};

export const parseTimeString = (timeStr: string | null | undefined): Date => {
  const today = new Date();

  // Handle null, undefined, or empty timeStr
  if (!timeStr || typeof timeStr !== "string" || timeStr.trim() === "") {
    console.warn("parseTimeString called with invalid time:", timeStr);
    // Return current time as fallback
    return today;
  }

  try {
    const trimmedTime = timeStr.trim();
    const [hours, minutes, seconds = "0"] = trimmedTime.split(":");

    // Validate that we have valid hour and minute values
    const hourNum = parseInt(hours);
    const minuteNum = parseInt(minutes);
    const secondNum = parseInt(seconds);

    if (isNaN(hourNum) || isNaN(minuteNum) || isNaN(secondNum)) {
      console.warn("Invalid time components in:", timeStr);
      return today;
    }

    const newDate = new Date();
    newDate.setHours(hourNum, minuteNum, secondNum, 0);
    return newDate;
  } catch (error) {
    console.error("Error parsing time string:", timeStr, error);
    return today;
  }
};

export const formatTimeForDisplay = (
  timeStr: string | null | undefined
): string => {
  // Handle null, undefined, or empty timeStr
  if (!timeStr || typeof timeStr !== "string" || timeStr.trim() === "") {
    return "00:00";
  }

  try {
    // Convert HH:MM:SS to HH:MM for display
    const trimmed = timeStr.trim();
    if (trimmed.length >= 5) {
      return trimmed.substring(0, 5);
    }
    return trimmed;
  } catch (error) {
    console.error("Error formatting time for display:", timeStr, error);
    return "00:00";
  }
};

export const getCurrentPrayerAndNext = (
  prayerTime: PrayerTime
): { current: PrayerName | null; next: PrayerName } => {
  if (!prayerTime || typeof prayerTime !== "object") {
    console.warn(
      "getCurrentPrayerAndNext called with invalid prayerTime:",
      prayerTime
    );
    return { current: null, next: "fajr" };
  }

  const now = new Date();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  const prayers: Array<{ name: PrayerName; time: string }> = [
    { name: "fajr", time: prayerTime.fajr_begins || "00:00:00" },
    { name: "sunrise", time: prayerTime.sunrise || "00:00:00" },
    { name: "zuhr", time: prayerTime.zuhr_begins || "00:00:00" },
    { name: "asr", time: prayerTime.asr_mithl_1 || "00:00:00" },
    { name: "maghrib", time: prayerTime.maghrib_begins || "00:00:00" },
    { name: "isha", time: prayerTime.isha_begins || "00:00:00" },
  ];

  let current: PrayerName | null = null;
  let next: PrayerName = "fajr";

  for (let i = 0; i < prayers.length; i++) {
    const timeStr = prayers[i].time;

    if (!timeStr || typeof timeStr !== "string") {
      console.warn(`Invalid time for ${prayers[i].name}:`, timeStr);
      continue;
    }

    try {
      const [hours, minutes] = timeStr.split(":");
      const hourNum = parseInt(hours);
      const minuteNum = parseInt(minutes);

      if (isNaN(hourNum) || isNaN(minuteNum)) {
        console.warn(`Invalid time format for ${prayers[i].name}:`, timeStr);
        continue;
      }

      const prayerMinutes = hourNum * 60 + minuteNum;

      if (currentTimeMinutes >= prayerMinutes) {
        current = prayers[i].name;
        next = prayers[(i + 1) % prayers.length].name;
      } else {
        break;
      }
    } catch (error) {
      console.error(
        `Error processing time for ${prayers[i].name}:`,
        timeStr,
        error
      );
      continue;
    }
  }

  return { current, next };
};

export const getTimeUntilNext = (
  nextPrayerTime: string | null | undefined
): string => {
  if (
    !nextPrayerTime ||
    typeof nextPrayerTime !== "string" ||
    nextPrayerTime.trim() === ""
  ) {
    console.warn("getTimeUntilNext called with invalid time:", nextPrayerTime);
    return "0m";
  }

  try {
    const now = new Date();
    const nextTime = parseTimeString(nextPrayerTime);

    // If next prayer is tomorrow (e.g., Fajr)
    if (nextTime < now) {
      nextTime.setDate(nextTime.getDate() + 1);
    }

    const diff = nextTime.getTime() - now.getTime();

    if (diff <= 0) {
      return "0m";
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  } catch (error) {
    console.error(
      "Error calculating time until next prayer:",
      nextPrayerTime,
      error
    );
    return "0m";
  }
};

// New improved countdown function for real-time updates
export const getDetailedCountdown = (
  prayerTime: PrayerTime,
  nextPrayer: PrayerName
): string => {
  if (!prayerTime || !nextPrayer) {
    return "";
  }

  const prayerTimes = {
    fajr: prayerTime.fajr_begins,
    sunrise: prayerTime.sunrise,
    zuhr: prayerTime.zuhr_begins,
    asr: prayerTime.asr_mithl_1,
    maghrib: prayerTime.maghrib_begins,
    isha: prayerTime.isha_begins,
  };

  const nextPrayerTimeStr = prayerTimes[nextPrayer];
  if (!nextPrayerTimeStr) {
    return "";
  }

  try {
    const now = new Date();
    const [hours, minutes, seconds = "0"] = nextPrayerTimeStr.split(":");

    const nextTime = new Date();
    nextTime.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds), 0);

    // If the prayer time has passed today, it's tomorrow
    if (nextTime <= now) {
      nextTime.setDate(nextTime.getDate() + 1);
    }

    const diff = nextTime.getTime() - now.getTime();

    if (diff <= 0) {
      return "Now";
    }

    const totalMinutes = Math.floor(diff / (1000 * 60));
    const displayHours = Math.floor(totalMinutes / 60);
    const displayMinutes = totalMinutes % 60;

    // Format based on time remaining
    if (totalMinutes < 1) {
      return "Now";
    } else if (totalMinutes < 60) {
      return `${totalMinutes}m`;
    } else if (totalMinutes < 1440) {
      // Less than 24 hours
      return displayMinutes > 0
        ? `${displayHours}h ${displayMinutes}m`
        : `${displayHours}h`;
    } else {
      const days = Math.floor(totalMinutes / 1440);
      const remainingHours = Math.floor((totalMinutes % 1440) / 60);
      return `${days}d ${remainingHours}h`;
    }
  } catch (error) {
    console.error("Error calculating detailed countdown:", error);
    return "";
  }
};

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const getMonthName = (month: number): string => {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  if (month < 0 || month >= months.length) {
    console.warn("Invalid month index:", month);
    return "Unknown";
  }

  return months[month];
};

export const extractPrayersFromTime = (prayerTime: PrayerTime): Prayer[] => {
  if (!prayerTime || typeof prayerTime !== "object") {
    console.warn(
      "extractPrayersFromTime called with invalid prayerTime:",
      prayerTime
    );
    return [];
  }

  return [
    {
      name: "Fajr",
      begins: prayerTime.fajr_begins || "00:00:00",
      jamah: prayerTime.fajr_jamah || "",
    },
    {
      name: "Sunrise",
      begins: prayerTime.sunrise || "00:00:00",
      jamah: "",
    },
    {
      name: "Zuhr",
      begins: prayerTime.zuhr_begins || "00:00:00",
      jamah: prayerTime.zuhr_jamah || "",
    },
    {
      name: "Asr",
      begins: prayerTime.asr_mithl_1 || "00:00:00",
      jamah: prayerTime.asr_jamah || "",
    },
    {
      name: "Maghrib",
      begins: prayerTime.maghrib_begins || "00:00:00",
      jamah: prayerTime.maghrib_jamah || "",
    },
    {
      name: "Isha",
      begins: prayerTime.isha_begins || "00:00:00",
      jamah: prayerTime.isha_jamah || "",
    },
  ];
};

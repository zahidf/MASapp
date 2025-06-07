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

export const parseTimeString = (timeStr: string): Date => {
  const today = new Date();
  const [hours, minutes, seconds = "0"] = timeStr.split(":");
  today.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds), 0);
  return today;
};

export const formatTimeForDisplay = (timeStr: string): string => {
  // Convert HH:MM:SS to HH:MM for display
  return timeStr.substring(0, 5);
};

export const getCurrentPrayerAndNext = (
  prayerTime: PrayerTime
): { current: PrayerName | null; next: PrayerName } => {
  const now = new Date();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  const prayers: Array<{ name: PrayerName; time: string }> = [
    { name: "fajr", time: prayerTime.fajr_begins },
    { name: "sunrise", time: prayerTime.sunrise },
    { name: "zuhr", time: prayerTime.zuhr_begins },
    { name: "asr", time: prayerTime.asr_mithl_1 },
    { name: "maghrib", time: prayerTime.maghrib_begins },
    { name: "isha", time: prayerTime.isha_begins },
  ];

  let current: PrayerName | null = null;
  let next: PrayerName = "fajr";

  for (let i = 0; i < prayers.length; i++) {
    const [hours, minutes] = prayers[i].time.split(":");
    const prayerMinutes = parseInt(hours) * 60 + parseInt(minutes);

    if (currentTimeMinutes >= prayerMinutes) {
      current = prayers[i].name;
      next = prayers[(i + 1) % prayers.length].name;
    } else {
      break;
    }
  }

  return { current, next };
};

export const getTimeUntilNext = (nextPrayerTime: string): string => {
  const now = new Date();
  const nextTime = parseTimeString(nextPrayerTime);

  // If next prayer is tomorrow (e.g., Fajr)
  if (nextTime < now) {
    nextTime.setDate(nextTime.getDate() + 1);
  }

  const diff = nextTime.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
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
  return months[month];
};

export const extractPrayersFromTime = (prayerTime: PrayerTime): Prayer[] => {
  return [
    {
      name: "Fajr",
      begins: prayerTime.fajr_begins,
      jamah: prayerTime.fajr_jamah,
    },
    {
      name: "Sunrise",
      begins: prayerTime.sunrise,
      jamah: "",
    },
    {
      name: "Zuhr",
      begins: prayerTime.zuhr_begins,
      jamah: prayerTime.zuhr_jamah,
    },
    {
      name: "Asr",
      begins: prayerTime.asr_mithl_1,
      jamah: prayerTime.asr_jamah,
    },
    {
      name: "Maghrib",
      begins: prayerTime.maghrib_begins,
      jamah: prayerTime.maghrib_jamah,
    },
    {
      name: "Isha",
      begins: prayerTime.isha_begins,
      jamah: prayerTime.isha_jamah,
    },
  ];
};

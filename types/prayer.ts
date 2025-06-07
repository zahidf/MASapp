export interface PrayerTime {
  d_date: string;
  fajr_begins: string;
  fajr_jamah: string;
  sunrise: string;
  zuhr_begins: string;
  zuhr_jamah: string;
  asr_mithl_1: string;
  asr_mithl_2: string;
  asr_jamah: string;
  maghrib_begins: string;
  maghrib_jamah: string;
  isha_begins: string;
  isha_jamah: string;
  is_ramadan: number;
  hijri_date: string;
}

export interface MonthlyUploadRow {
  day: number;
  fajr_begins: string;
  fajr_jamah: string;
  sunrise: string;
  zuhr_begins: string;
  zuhr_jamah: string;
  asr_mithl_1: string;
  asr_mithl_2: string;
  asr_jamah: string;
  maghrib_begins: string;
  maghrib_jamah: string;
  isha_begins: string;
  isha_jamah: string;
}

export interface Prayer {
  name: string;
  begins: string;
  jamah: string;
}

export type PrayerName =
  | "fajr"
  | "sunrise"
  | "zuhr"
  | "asr"
  | "maghrib"
  | "isha";

export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

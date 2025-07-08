/**
 * Prayer time validation and sanitization utilities
 */

import { PrayerTime } from '@/types/prayer';

/**
 * Time format validation (HH:MM)
 */
const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Date format validation (YYYY-MM-DD)
 */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate time format
 */
export const isValidTimeFormat = (time: string): boolean => {
  if (!time || typeof time !== 'string') return false;
  return TIME_REGEX.test(time);
};

/**
 * Validate date format
 */
export const isValidDateFormat = (date: string): boolean => {
  if (!date || typeof date !== 'string') return false;
  if (!DATE_REGEX.test(date)) return false;
  
  // Additional validation for actual date
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
};

/**
 * Sanitize time string
 */
export const sanitizeTime = (time: string): string => {
  if (!time) return '';
  
  // Remove any non-digit or colon characters
  const cleaned = time.replace(/[^\d:]/g, '');
  
  // Ensure proper format
  const parts = cleaned.split(':');
  if (parts.length !== 2) return '';
  
  const hours = parts[0].padStart(2, '0');
  const minutes = parts[1].padStart(2, '0');
  
  // Validate ranges
  const hoursNum = parseInt(hours, 10);
  const minutesNum = parseInt(minutes, 10);
  
  if (hoursNum > 23 || minutesNum > 59) return '';
  
  return `${hours}:${minutes}`;
};

/**
 * Validate prayer time object
 */
export const validatePrayerTime = (prayerTime: any): prayerTime is PrayerTime => {
  if (!prayerTime || typeof prayerTime !== 'object') {
    return false;
  }

  const requiredFields = [
    'd_date',
    'fajr_begins',
    'fajr_iqamah',
    'sunrise',
    'zuhr_begins',
    'zuhr_iqamah',
    'asr_begins',
    'asr_iqamah',
    'maghrib_begins',
    'maghrib_iqamah',
    'isha_begins',
    'isha_iqamah'
  ];

  // Check all required fields exist
  for (const field of requiredFields) {
    if (!(field in prayerTime)) {
      // Missing required field
      return false;
    }
  }

  // Validate date format
  if (!isValidDateFormat(prayerTime.d_date)) {
    // Invalid date format
    return false;
  }

  // Validate all time fields
  const timeFields = requiredFields.filter(field => field !== 'd_date');
  for (const field of timeFields) {
    if (!isValidTimeFormat(prayerTime[field])) {
      // Invalid time format
      return false;
    }
  }

  // Validate logical time order
  const timeOrder = [
    'fajr_begins',
    'fajr_iqamah',
    'sunrise',
    'zuhr_begins',
    'zuhr_iqamah',
    'asr_begins',
    'asr_iqamah',
    'maghrib_begins',
    'maghrib_iqamah',
    'isha_begins',
    'isha_iqamah'
  ];

  for (let i = 0; i < timeOrder.length - 1; i++) {
    const currentTime = prayerTime[timeOrder[i]];
    const nextTime = prayerTime[timeOrder[i + 1]];
    
    if (compareTimeStrings(currentTime, nextTime) >= 0) {
      // Special case: Isha might be after midnight
      if (timeOrder[i] === 'isha_begins' || timeOrder[i] === 'isha_iqamah') {
        continue;
      }
      
      // Time order violation
      return false;
    }
  }

  return true;
};

/**
 * Compare two time strings (HH:MM format)
 * Returns: -1 if time1 < time2, 0 if equal, 1 if time1 > time2
 */
export const compareTimeStrings = (time1: string, time2: string): number => {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  
  if (h1 < h2) return -1;
  if (h1 > h2) return 1;
  if (m1 < m2) return -1;
  if (m1 > m2) return 1;
  return 0;
};

/**
 * Sanitize prayer time object
 */
export const sanitizePrayerTime = (prayerTime: any): PrayerTime | null => {
  if (!prayerTime || typeof prayerTime !== 'object') {
    return null;
  }

  try {
    const sanitized: any = {
      d_date: prayerTime.d_date?.trim() || '',
      fajr_begins: sanitizeTime(prayerTime.fajr_begins || ''),
      fajr_iqamah: sanitizeTime(prayerTime.fajr_iqamah || ''),
      sunrise: sanitizeTime(prayerTime.sunrise || ''),
      zuhr_begins: sanitizeTime(prayerTime.zuhr_begins || ''),
      zuhr_iqamah: sanitizeTime(prayerTime.zuhr_iqamah || ''),
      asr_begins: sanitizeTime(prayerTime.asr_begins || ''),
      asr_iqamah: sanitizeTime(prayerTime.asr_iqamah || ''),
      maghrib_begins: sanitizeTime(prayerTime.maghrib_begins || ''),
      maghrib_iqamah: sanitizeTime(prayerTime.maghrib_iqamah || ''),
      isha_begins: sanitizeTime(prayerTime.isha_begins || ''),
      isha_iqamah: sanitizeTime(prayerTime.isha_iqamah || ''),
    };

    // Include optional fields if present
    if ('hijri_date' in prayerTime) {
      sanitized.hijri_date = String(prayerTime.hijri_date).trim();
    }
    if ('hijri_month' in prayerTime) {
      sanitized.hijri_month = String(prayerTime.hijri_month).trim();
    }

    // Validate the sanitized object
    if (validatePrayerTime(sanitized)) {
      return sanitized as PrayerTime;
    }

    return null;
  } catch (error) {
    // Error sanitizing prayer time
    return null;
  }
};

/**
 * Validate array of prayer times
 */
export const validatePrayerTimesArray = (prayerTimes: any[]): PrayerTime[] => {
  if (!Array.isArray(prayerTimes)) {
    // Input is not an array
    return [];
  }

  const validPrayerTimes: PrayerTime[] = [];
  const errors: string[] = [];

  for (let i = 0; i < prayerTimes.length; i++) {
    const sanitized = sanitizePrayerTime(prayerTimes[i]);
    
    if (sanitized) {
      validPrayerTimes.push(sanitized);
    } else {
      errors.push(`Invalid prayer time at index ${i}: ${prayerTimes[i]?.d_date || 'unknown date'}`);
    }
  }

  // Validation complete

  return validPrayerTimes;
};

/**
 * Check for duplicate dates in prayer times array
 */
export const findDuplicateDates = (prayerTimes: PrayerTime[]): string[] => {
  const dateCount = new Map<string, number>();
  
  for (const pt of prayerTimes) {
    const count = dateCount.get(pt.d_date) || 0;
    dateCount.set(pt.d_date, count + 1);
  }

  const duplicates: string[] = [];
  dateCount.forEach((count, date) => {
    if (count > 1) {
      duplicates.push(date);
    }
  });

  // Duplicates check complete

  return duplicates;
};

/**
 * Remove duplicates from prayer times array (keeps the last occurrence)
 */
export const removeDuplicatePrayerTimes = (prayerTimes: PrayerTime[]): PrayerTime[] => {
  const uniqueMap = new Map<string, PrayerTime>();
  
  for (const pt of prayerTimes) {
    uniqueMap.set(pt.d_date, pt);
  }

  return Array.from(uniqueMap.values()).sort((a, b) => 
    new Date(a.d_date).getTime() - new Date(b.d_date).getTime()
  );
};
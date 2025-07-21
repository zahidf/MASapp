// Number localization utility

const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const persianNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Converts Western Arabic numerals (0-9) to localized numerals based on language
 * @param input - The string containing numbers to convert
 * @param language - The target language code
 * @returns The string with localized numbers
 */
export function localizeNumbers(input: string | number, language: string): string {
  const str = String(input);
  
  // For English, return as-is
  if (language === 'en') {
    return str;
  }
  
  // For Arabic and Pashto, use Arabic-Indic numerals
  if (language === 'ar' || language === 'ps') {
    return str.replace(/[0-9]/g, (match) => arabicNumerals[parseInt(match)]);
  }
  
  // For Farsi/Persian, use Persian numerals
  if (language === 'fa') {
    return str.replace(/[0-9]/g, (match) => persianNumerals[parseInt(match)]);
  }
  
  // Default to Western numerals
  return str;
}

/**
 * Formats time with localized numbers
 * @param time - Time string in HH:MM or HH:MM:SS format
 * @param language - The target language code
 * @returns Formatted time with localized numbers
 */
export function localizeTime(time: string, language: string): string {
  // First ensure we have a valid time format
  if (!time || time.trim() === '') return '';
  
  // Extract hours and minutes
  const parts = time.split(':');
  if (parts.length < 2) return time;
  
  const hours = parts[0];
  const minutes = parts[1];
  
  // Format as HH:MM and localize
  const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  return localizeNumbers(formattedTime, language);
}

/**
 * Formats date with localized numbers
 * @param day - Day number
 * @param language - The target language code
 * @returns Localized day number
 */
export function localizeDay(day: number, language: string): string {
  return localizeNumbers(day.toString(), language);
}

/**
 * Formats year with localized numbers
 * @param year - Year number
 * @param language - The target language code
 * @returns Localized year number
 */
export function localizeYear(year: number, language: string): string {
  return localizeNumbers(year.toString(), language);
}

/**
 * Localizes a full date string (e.g., "15 January 2025")
 * @param dateStr - Date string containing numbers
 * @param language - The target language code
 * @returns Date string with localized numbers
 */
export function localizeDateString(dateStr: string, language: string): string {
  return localizeNumbers(dateStr, language);
}
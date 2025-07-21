interface HijriDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
  monthNameAr: string;
}

const HIJRI_MONTHS = [
  { en: "Muharram", ar: "محرم" },
  { en: "Safar", ar: "صفر" },
  { en: "Rabi' al-awwal", ar: "ربيع الأول" },
  { en: "Rabi' al-thani", ar: "ربيع الثاني" },
  { en: "Jumada al-awwal", ar: "جمادى الأولى" },
  { en: "Jumada al-thani", ar: "جمادى الثانية" },
  { en: "Rajab", ar: "رجب" },
  { en: "Sha'ban", ar: "شعبان" },
  { en: "Ramadan", ar: "رمضان" },
  { en: "Shawwal", ar: "شوال" },
  { en: "Dhu al-Qi'dah", ar: "ذو القعدة" },
  { en: "Dhu al-Hijjah", ar: "ذو الحجة" }
];

// Convert Gregorian date to Hijri using Umm al-Qura calendar algorithm
export const gregorianToHijri = (gregorianDate: Date): HijriDate => {
  const gYear = gregorianDate.getFullYear();
  const gMonth = gregorianDate.getMonth() + 1;
  const gDay = gregorianDate.getDate();

  // Calculate Julian Day Number
  const a = Math.floor((14 - gMonth) / 12);
  const y = gYear + 4800 - a;
  const m = gMonth + 12 * a - 3;
  
  const jd = gDay + Math.floor((153 * m + 2) / 5) + 365 * y + 
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  // Convert Julian Day to Hijri
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + 
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - 
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  
  const hMonth = Math.floor((24 * l3) / 709);
  const hDay = l3 - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;

  const monthIndex = hMonth - 1;
  
  return {
    year: hYear,
    month: hMonth,
    day: hDay,
    monthName: HIJRI_MONTHS[monthIndex]?.en || "",
    monthNameAr: HIJRI_MONTHS[monthIndex]?.ar || ""
  };
};

// Convert Hijri date to Gregorian
export const hijriToGregorian = (hijriYear: number, hijriMonth: number, hijriDay: number): Date => {
  // Calculate Julian Day Number from Hijri date
  const jd = Math.floor((11 * hijriYear + 3) / 30) + 
    354 * hijriYear + 30 * hijriMonth - 
    Math.floor((hijriMonth - 1) / 2) + hijriDay + 1948440 - 385;

  // Convert Julian Day to Gregorian
  const l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  const l2 = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l2 + 1)) / 1461001);
  const l3 = l2 - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l3) / 2447);
  const gDay = l3 - Math.floor((2447 * j) / 80);
  const l4 = Math.floor(j / 11);
  const gMonth = j + 2 - 12 * l4;
  const gYear = 100 * (n - 49) + i + l4;

  return new Date(gYear, gMonth - 1, gDay);
};

// Format Hijri date for display
export const formatHijriDate = (hijriDate: HijriDate, locale: string = 'en', translations?: any): string => {
  const monthName = getHijriMonthName(hijriDate.month, locale, translations);
  const { localizeDay, localizeYear } = require('./numberLocalization');
  
  const day = localizeDay(hijriDate.day, locale);
  const year = localizeYear(hijriDate.year, locale);
  
  if (locale === 'ar' || locale === 'fa' || locale === 'ps') {
    return `${day} ${monthName} ${year} هـ`;
  }
  
  return `${day} ${monthName} ${year} AH`;
};

// Get Hijri month name with support for translations
export const getHijriMonthName = (month: number, locale: string = 'en', translations?: any): string => {
  const monthIndex = month - 1;
  if (monthIndex < 0 || monthIndex >= HIJRI_MONTHS.length) {
    return '';
  }
  
  // If translations are provided, use them
  if (translations?.calendar?.hijriMonths) {
    const monthKeys = [
      'muharram', 'safar', 'rabiAlAwwal', 'rabiAlThani',
      'jumadaAlAwwal', 'jumadaAlThani', 'rajab', 'shaban',
      'ramadan', 'shawwal', 'dhuAlQidah', 'dhuAlHijjah'
    ];
    const monthKey = monthKeys[monthIndex];
    if (translations.calendar.hijriMonths[monthKey]) {
      return translations.calendar.hijriMonths[monthKey];
    }
  }
  
  // Fallback to built-in names
  return locale === 'ar' ? HIJRI_MONTHS[monthIndex].ar : HIJRI_MONTHS[monthIndex].en;
};

// Get days in a Hijri month
export const getDaysInHijriMonth = (year: number, month: number): number => {
  // Hijri months alternate between 29 and 30 days
  // with adjustments for leap years
  if (month === 12) {
    // Dhu al-Hijjah can have 30 days in leap years
    return isHijriLeapYear(year) ? 30 : 29;
  }
  
  // Odd months have 30 days, even months have 29 days
  return month % 2 === 1 ? 30 : 29;
};

// Check if a Hijri year is a leap year
export const isHijriLeapYear = (year: number): boolean => {
  // In a 30-year cycle, years 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29 are leap years
  const leapYears = [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29];
  const yearInCycle = year % 30;
  return leapYears.includes(yearInCycle);
};

// Get the first day of a Hijri month as a Gregorian date
export const getFirstDayOfHijriMonth = (hijriYear: number, hijriMonth: number): Date => {
  return hijriToGregorian(hijriYear, hijriMonth, 1);
};

// Get current Hijri date
export const getCurrentHijriDate = (): HijriDate => {
  return gregorianToHijri(new Date());
};

// Format date range for Hijri calendar
export const formatHijriMonthYear = (hijriDate: HijriDate, locale: string = 'en', translations?: any): string => {
  const monthName = getHijriMonthName(hijriDate.month, locale, translations);
  const { localizeYear } = require('./numberLocalization');
  
  const year = localizeYear(hijriDate.year, locale);
  
  if (locale === 'ar' || locale === 'fa' || locale === 'ps') {
    return `${monthName} ${year} هـ`;
  }
  
  return `${monthName} ${year} AH`;
};
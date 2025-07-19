export type Language = 'en' | 'ps' | 'fa' | 'ar';

export interface LanguagePreferences {
  language: Language;
  hasSelectedLanguage: boolean;
}

export const DEFAULT_LANGUAGE_PREFERENCES: LanguagePreferences = {
  language: 'en',
  hasSelectedLanguage: false,
};

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو' },
  { code: 'fa', name: 'Dari', nativeName: 'دری' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
] as const;
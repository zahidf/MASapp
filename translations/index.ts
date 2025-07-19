import { Language } from '@/types/language';
import ar from './ar';
import en from './en';
import fa from './fa';
import ps from './ps';

export const translations = {
  en,
  ps,
  fa,
  ar,
};

export type TranslationKeys = typeof en;

export function getTranslation(language: Language): TranslationKeys {
  return translations[language] || translations.en;
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { I18nManager } from 'react-native';

import { getTranslation, TranslationKeys } from '@/translations';
import { DEFAULT_LANGUAGE_PREFERENCES, Language, LanguagePreferences } from '@/types/language';

interface LanguageContextType {
  language: Language;
  t: TranslationKeys;
  hasSelectedLanguage: boolean;
  changeLanguage: (language: Language) => Promise<void>;
  completeLanguageSetup: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = '@mas_language_preferences';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<LanguagePreferences>(DEFAULT_LANGUAGE_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const t = getTranslation(preferences.language);

  useEffect(() => {
    // Always disable RTL layout - we only want text translations, not UI changes
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
    loadLanguagePreferences();
  }, []);

  const loadLanguagePreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LanguagePreferences;
        setPreferences(parsed);
      }
    } catch (error) {
      console.error('Error loading language preferences:', error);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  const changeLanguage = async (language: Language) => {
    // Create the new preferences object
    const newPreferences = {
      ...preferences,
      language,
    };
    
    // Update state immediately for instant UI update
    setPreferences(newPreferences);
    
    // Then persist to storage with the same object
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(newPreferences));
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const completeLanguageSetup = async () => {
    // Get current preferences from state
    const updatedPreferences = {
      ...preferences,
      hasSelectedLanguage: true,
    };
    
    // Update state
    setPreferences(updatedPreferences);
    
    // Save to storage
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(updatedPreferences));
    } catch (error) {
      console.error('Error completing language setup:', error);
    }
  };


  if (isLoading) {
    return null;
  }

  return (
    <LanguageContext.Provider
      value={{
        language: preferences.language,
        t,
        hasSelectedLanguage: preferences.hasSelectedLanguage,
        changeLanguage,
        completeLanguageSetup,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
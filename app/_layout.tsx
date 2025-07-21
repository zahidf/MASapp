import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";

import { LanguageSetupModal } from "@/components/language/LanguageSetupModal";
import { SetupFlowModals } from "@/components/SetupFlowModals";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { PrayerTimesProvider } from "@/contexts/PrayerTimesContext";
import { SetupFlowProvider } from "@/contexts/SetupFlowContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { firebasePrayerTimesService } from "@/services/firebasePrayerTimes";

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const { hasSelectedLanguage } = useLanguage();
  const [showLanguageSetup, setShowLanguageSetup] = useState(false);
  const [hasCheckedLanguage, setHasCheckedLanguage] = useState(false);
  const [languageSetupCompleted, setLanguageSetupCompleted] = useState(false);
  const [isTestingSetup, setIsTestingSetup] = useState(false);

  useEffect(() => {
    // Check if we need to show language setup
    if (!hasCheckedLanguage && !hasSelectedLanguage) {
      setHasCheckedLanguage(true);
      // Small delay for smooth UI
      setTimeout(() => {
        setShowLanguageSetup(true);
      }, 500);
    }
  }, [hasSelectedLanguage, hasCheckedLanguage]);

  // Global function to start setup flow (for testing)
  useEffect(() => {
    (window as any).startSetupFlow = () => {
      setIsTestingSetup(true);
      setShowLanguageSetup(true);
    };
  }, []);

  const handleLanguageSetupComplete = () => {
    setShowLanguageSetup(false);
    setLanguageSetupCompleted(true);
    
    // If testing setup flow, trigger notification modal immediately
    if (isTestingSetup) {
      // Use NotificationContext to show the modal
      setTimeout(() => {
        (window as any).showNotificationSetup?.();
      }, 100);
    }
  };

  return (
    <>
      <PrayerTimesProvider>
        <NotificationProvider>
          <SetupFlowProvider>
            <ThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" options={{ headerShown: true }} />
              </Stack>
              <StatusBar style="auto" />
              
              {/* Setup Flow Modals for testing */}
              <SetupFlowModals />
            </ThemeProvider>
          </SetupFlowProvider>
        </NotificationProvider>
      </PrayerTimesProvider>
      
      {/* Language Setup Modal for regular flow */}
      <LanguageSetupModal
        visible={showLanguageSetup}
        onComplete={handleLanguageSetupComplete}
      />
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    // Initialize Firebase prayer times service
    firebasePrayerTimesService.getAllPrayerTimes()
      .then(() => {
        setIsDataLoaded(true);
      })
      .catch((error) => {
        // Even if Firebase fails, continue loading the app
        setIsDataLoaded(true);
      });
  }, []);

  if (!loaded || !isDataLoaded) {
    return null;
  }

  return (
    <LanguageProvider>
      <RootLayoutContent />
    </LanguageProvider>
  );
}
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
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { PrayerTimesProvider } from "@/contexts/PrayerTimesContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { firebasePrayerTimesService } from "@/services/firebasePrayerTimes";

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const { hasSelectedLanguage } = useLanguage();
  const [showLanguageSetup, setShowLanguageSetup] = useState(false);
  const [hasCheckedLanguage, setHasCheckedLanguage] = useState(false);

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

  const handleLanguageSetupComplete = () => {
    setShowLanguageSetup(false);
  };

  return (
    <>
      <PrayerTimesProvider>
        <NotificationProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" options={{ headerShown: true }} />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </NotificationProvider>
      </PrayerTimesProvider>
      
      {/* Language Setup Modal */}
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
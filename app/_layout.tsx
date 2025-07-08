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

import { NotificationProvider } from "@/contexts/NotificationContext";
import { PrayerTimesProvider } from "@/contexts/PrayerTimesContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { firebasePrayerTimesService } from "@/services/firebasePrayerTimes";

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
  );
}
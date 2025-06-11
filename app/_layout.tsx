// app/_layout.tsx
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

import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { PrayerTimesProvider } from "@/contexts/PrayerTimesContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { loadPrayerTimes } from "@/utils/storage";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    // Load initial prayer times data
    loadPrayerTimes()
      .then(() => {
        console.log("Prayer times loaded successfully in root layout");
        setIsDataLoaded(true);
      })
      .catch((error) => {
        console.error("Failed to load prayer times in root layout:", error);
        setIsDataLoaded(true); // Continue with error
      });
  }, []);

  if (!loaded || !isDataLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <PrayerTimesProvider>
        <NotificationProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="auth"
                options={{
                  presentation: "modal",
                  headerShown: false,
                }}
              />
              <Stack.Screen name="+not-found" options={{ headerShown: true }} />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </NotificationProvider>
      </PrayerTimesProvider>
    </AuthProvider>
  );
}

import * as Notifications from "expo-notifications";
import React, { createContext, ReactNode, useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { NotificationPreferences } from "@/types/notification";
import { NotificationService } from "@/utils/notificationService";

interface NotificationContextType {
  preferences: NotificationPreferences;
  isLoading: boolean;
  shouldShowSetup: boolean;
  updatePreferences: (preferences: NotificationPreferences) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  checkPermissionStatus: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { prayerTimes } = usePrayerTimes();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    prayerBeginTimes: false,
    jamahTimes: false,
    jamahReminderMinutes: 10,
    isEnabled: false,
    hasAskedPermission: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowSetup, setShouldShowSetup] = useState(false);

  useEffect(() => {
    loadPreferences();
    setupNotificationListeners();
    setupAppStateListener();
  }, []);

  useEffect(() => {
    // Update notifications when prayer times change
    if (prayerTimes.length > 0 && preferences.isEnabled) {
      refreshNotifications();
    }
  }, [prayerTimes, preferences]);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      const savedPreferences = await NotificationService.loadPreferences();
      setPreferences(savedPreferences);

      // Show setup modal if user hasn't been asked yet
      if (!savedPreferences.hasAskedPermission) {
        setShouldShowSetup(true);
      }
    } catch (error) {
      console.error("Error loading notification preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      setIsLoading(true);

      // Request permissions if enabling notifications
      if (newPreferences.isEnabled && !preferences.isEnabled) {
        const hasPermission = await NotificationService.requestPermissions();
        if (!hasPermission) {
          // User denied permissions, disable notifications
          newPreferences.isEnabled = false;
          newPreferences.prayerBeginTimes = false;
          newPreferences.jamahTimes = false;
        }
      }

      // Save preferences
      await NotificationService.savePreferences(newPreferences);
      setPreferences(newPreferences);

      // Update scheduled notifications
      await NotificationService.updateNotifications(
        prayerTimes,
        newPreferences
      );

      // Hide setup modal
      setShouldShowSetup(false);

      console.log("Notification preferences updated:", newPreferences);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshNotifications = async () => {
    try {
      if (preferences.isEnabled && prayerTimes.length > 0) {
        await NotificationService.updateNotifications(prayerTimes, preferences);
        console.log("Notifications refreshed");
      }
    } catch (error) {
      console.error("Error refreshing notifications:", error);
    }
  };

  const checkPermissionStatus = async (): Promise<boolean> => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Error checking notification permissions:", error);
      return false;
    }
  };

  const setupNotificationListeners = () => {
    // Listen for notification responses (when user taps notification)
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const { data } = response.notification.request.content;
        console.log("Notification tapped:", data);

        // You can add navigation logic here based on notification data
        // For example, navigate to prayer details or today's schedule
      });

    // Listen for notifications received while app is in foreground
    const foregroundListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received in foreground:", notification);
      }
    );

    return () => {
      Notifications.removeNotificationSubscription(responseListener);
      Notifications.removeNotificationSubscription(foregroundListener);
    };
  };

  const setupAppStateListener = () => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && preferences.isEnabled) {
        // Refresh notifications when app becomes active
        // This helps ensure notifications stay current
        setTimeout(() => {
          refreshNotifications();
        }, 1000);
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  };

  const contextValue = {
    preferences,
    isLoading,
    shouldShowSetup,
    updatePreferences,
    refreshNotifications,
    checkPermissionStatus,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotificationContext = () => {
  const context = React.useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotificationContext must be used within NotificationProvider"
    );
  }
  return context;
};

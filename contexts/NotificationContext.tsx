import * as Notifications from "expo-notifications";
import React, { createContext, ReactNode, useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

import { NotificationSetupModal } from "@/components/notifications/NotificationSetupModal";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreferences,
  PrayerNotificationSettings,
} from "@/types/notification";
import { PrayerName } from "@/types/prayer";
import { NotificationService } from "@/utils/notificationService";

type NotificationPrayerName = keyof NotificationPreferences["prayers"];

interface NotificationContextType {
  preferences: NotificationPreferences;
  isLoading: boolean;
  shouldShowSetup: boolean;
  updatePreferences: (preferences: NotificationPreferences) => Promise<void>;
  updatePrayerSettings: (
    prayer: NotificationPrayerName, // Changed from PrayerName
    settings: PrayerNotificationSettings
  ) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  checkPermissionStatus: () => Promise<boolean>;
  dismissSetup: () => void;
  showSetupModal: () => void; // Add manual trigger
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { prayerTimes } = usePrayerTimes();
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowSetup, setShouldShowSetup] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [hasCheckedForModal, setHasCheckedForModal] = useState(false);

  const validPrayers: NotificationPrayerName[] = [
    "fajr",
    "zuhr",
    "asr",
    "maghrib",
    "isha",
  ];

  // Helper function to check if a prayer name is valid for notifications
  const isNotificationPrayer = (
    prayer: PrayerName
  ): prayer is NotificationPrayerName => {
    return validPrayers.includes(prayer as NotificationPrayerName);
  };

  useEffect(() => {
    initializeNotifications();
    setupNotificationListeners();
    setupAppStateListener();
  }, []);

  // Check if we should show modal when prayer times are loaded
  useEffect(() => {
    console.log(
      "NotificationProvider: Check modal conditions - prayerTimes:",
      prayerTimes.length,
      "hasAskedPermission:",
      preferences.hasAskedPermission,
      "hasCheckedForModal:",
      hasCheckedForModal,
      "hasInitialized:",
      hasInitialized
    );

    if (
      prayerTimes.length > 0 &&
      !preferences.hasAskedPermission &&
      !hasCheckedForModal &&
      hasInitialized
    ) {
      console.log("NotificationProvider: All conditions met, showing modal");
      setHasCheckedForModal(true);
      // Delay to ensure smooth UI
      setTimeout(() => {
        setShouldShowSetup(true);
      }, 1000);
    }
  }, [prayerTimes.length, preferences.hasAskedPermission, hasInitialized, hasCheckedForModal]);

  useEffect(() => {
    // Update notifications when prayer times change, but only after initialization
    if (hasInitialized && prayerTimes.length > 0 && preferences.isEnabled) {
      refreshNotifications();
    }
  }, [prayerTimes, preferences.isEnabled, hasInitialized]);

  const initializeNotifications = async () => {
    try {
      setIsLoading(true);
      console.log("NotificationProvider: Initializing...");

      const savedPreferences = await NotificationService.loadPreferences();
      console.log(
        "NotificationProvider: Loaded preferences:",
        savedPreferences
      );

      setPreferences(savedPreferences);
      setHasInitialized(true);
    } catch (error) {
      console.error("Error initializing notifications:", error);
      setHasInitialized(true);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      setIsLoading(true);
      console.log("Updating notification preferences:", newPreferences);

      // Request permissions if enabling notifications
      if (newPreferences.isEnabled && !preferences.isEnabled) {
        const hasPermission = await NotificationService.requestPermissions();
        if (!hasPermission) {
          // User denied permissions, disable notifications
          newPreferences.isEnabled = false;
          // Disable all prayer notifications
          Object.keys(newPreferences.prayers).forEach((prayer) => {
            const prayerKey = prayer as NotificationPrayerName;
            newPreferences.prayers[prayerKey].beginTime = false;
            newPreferences.prayers[prayerKey].jamahTime = false;
          });
        }
      }

      // Mark that user has been asked
      newPreferences.hasAskedPermission = true;

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

      console.log("Notification preferences updated successfully");
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePrayerSettings = async (
    prayer: NotificationPrayerName, // Changed parameter type
    settings: PrayerNotificationSettings
  ) => {
    try {
      // Check if we need to request permissions
      if (
        !preferences.isEnabled &&
        (settings.beginTime || settings.jamahTime)
      ) {
        const hasPermission = await NotificationService.requestPermissions();
        if (!hasPermission) {
          console.log("Permission denied, cannot enable notifications");
          return;
        }
      }

      const newPreferences: NotificationPreferences = {
        ...preferences,
        isEnabled: true, // Enable if any notification is turned on
        prayers: {
          ...preferences.prayers,
          [prayer]: settings,
        },
      };

      // Check if any notifications are still enabled
      const hasAnyEnabled = Object.values(newPreferences.prayers).some(
        (p) => p.beginTime || p.jamahTime
      );

      if (!hasAnyEnabled) {
        newPreferences.isEnabled = false;
      }

      await updatePreferences(newPreferences);
    } catch (error) {
      console.error("Error updating prayer settings:", error);
      throw error;
    }
  };

  const dismissSetup = async () => {
    try {
      // Mark that user has been asked, even if they dismissed
      const dismissedPreferences = {
        ...preferences,
        hasAskedPermission: true,
      };

      await NotificationService.savePreferences(dismissedPreferences);
      setPreferences(dismissedPreferences);
      setShouldShowSetup(false);

      console.log("Notification setup dismissed");
    } catch (error) {
      console.error("Error dismissing setup:", error);
      setShouldShowSetup(false);
    }
  };

  const showSetupModal = () => {
    console.log("NotificationProvider: Manual show setup modal");
    setShouldShowSetup(true);
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
      if (
        nextAppState === "active" &&
        preferences.isEnabled &&
        hasInitialized
      ) {
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
    updatePrayerSettings,
    refreshNotifications,
    checkPermissionStatus,
    dismissSetup,
    showSetupModal,
  };

  console.log(
    "NotificationProvider: Render - shouldShowSetup:",
    shouldShowSetup
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}

      {/* Show notification setup modal */}
      <NotificationSetupModal
        visible={shouldShowSetup}
        onComplete={updatePreferences}
        onSkip={dismissSetup}
      />
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
import * as Notifications from "expo-notifications";
import React, { createContext, ReactNode, useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

import { NotificationSetupModal } from "@/components/notifications/NotificationSetupModal";
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
  dismissSetup: () => void;
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
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    initializeNotifications();
    setupNotificationListeners();
    setupAppStateListener();
  }, []);

  useEffect(() => {
    // Update notifications when prayer times change, but only after initialization
    if (hasInitialized && prayerTimes.length > 0 && preferences.isEnabled) {
      refreshNotifications();
    }
  }, [prayerTimes, preferences, hasInitialized]);

  const initializeNotifications = async () => {
    try {
      setIsLoading(true);
      console.log("NotificationProvider: Initializing...");

      // Small delay only for initialization to prevent race conditions
      await new Promise((resolve) => setTimeout(resolve, 300));

      const savedPreferences = await NotificationService.loadPreferences();
      console.log(
        "NotificationProvider: Loaded preferences:",
        savedPreferences
      );

      setPreferences(savedPreferences);
      setHasInitialized(true);

      // Show setup modal if user hasn't been asked yet (only on first-time use)
      if (!savedPreferences.hasAskedPermission) {
        console.log(
          "NotificationProvider: User hasn't been asked, will show setup modal"
        );
        // Small delay only to ensure UI is ready, not for user experience
        setTimeout(() => {
          setShouldShowSetup(true);
        }, 1000); // Just 1 second to ensure app UI is stable
      }
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
          newPreferences.prayerBeginTimes = false;
          newPreferences.jamahTimes = false;
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
    refreshNotifications,
    checkPermissionStatus,
    dismissSetup,
  };

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

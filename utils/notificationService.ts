import {
  NotificationPreferences,
  PrayerNotification,
} from "@/types/notification";
import { PrayerTime } from "@/types/prayer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const NOTIFICATION_STORAGE_KEY = "@notification_preferences";
const SCHEDULED_NOTIFICATIONS_KEY = "@scheduled_notifications";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Notification permission denied");
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("prayer-times", {
          name: "Prayer Times",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#1B5E20",
          description: "Notifications for prayer times and jamah reminders",
        });
      }

      return true;
    } catch (error) {
      console.error("Error requesting notification permissions:", error);
      return false;
    }
  }

  static async savePreferences(
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        NOTIFICATION_STORAGE_KEY,
        JSON.stringify(preferences)
      );
      console.log("Notification preferences saved:", preferences);
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      throw error;
    }
  }

  static async loadPreferences(): Promise<NotificationPreferences> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (stored) {
        const preferences = JSON.parse(stored);
        // Ensure all required fields exist (for backwards compatibility)
        return {
          prayerBeginTimes: preferences.prayerBeginTimes ?? false,
          jamahTimes: preferences.jamahTimes ?? false,
          jamahReminderMinutes: preferences.jamahReminderMinutes ?? 10,
          isEnabled: preferences.isEnabled ?? false,
          hasAskedPermission: preferences.hasAskedPermission ?? false,
        };
      }
      return {
        prayerBeginTimes: false,
        jamahTimes: false,
        jamahReminderMinutes: 10,
        isEnabled: false,
        hasAskedPermission: false,
      };
    } catch (error) {
      console.error("Error loading notification preferences:", error);
      return {
        prayerBeginTimes: false,
        jamahTimes: false,
        jamahReminderMinutes: 10,
        isEnabled: false,
        hasAskedPermission: false,
      };
    }
  }

  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem(SCHEDULED_NOTIFICATIONS_KEY);
      console.log("All notifications cancelled");
    } catch (error) {
      console.error("Error cancelling notifications:", error);
    }
  }

  static async scheduleNotificationsForDays(
    prayerTimes: PrayerTime[],
    preferences: NotificationPreferences,
    daysAhead: number = 7
  ): Promise<void> {
    if (
      !preferences.isEnabled ||
      (!preferences.prayerBeginTimes && !preferences.jamahTimes)
    ) {
      console.log("Notifications disabled or no preferences set");
      return;
    }

    try {
      // Cancel existing notifications first
      await this.cancelAllNotifications();

      const today = new Date();
      const scheduledNotifications: PrayerNotification[] = [];

      // Schedule for next 'daysAhead' days
      for (let i = 0; i < daysAhead; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);

        const dateStr = targetDate.toISOString().split("T")[0];
        const dayPrayerTimes = prayerTimes.find((pt) => pt.d_date === dateStr);

        if (dayPrayerTimes) {
          await this.scheduleNotificationsForDay(
            dayPrayerTimes,
            preferences,
            scheduledNotifications
          );
        }
      }

      // Save scheduled notifications for tracking
      await AsyncStorage.setItem(
        SCHEDULED_NOTIFICATIONS_KEY,
        JSON.stringify(scheduledNotifications)
      );

      console.log(`Scheduled ${scheduledNotifications.length} notifications`);
    } catch (error) {
      console.error("Error scheduling notifications:", error);
    }
  }

  private static async scheduleNotificationsForDay(
    prayerTime: PrayerTime,
    preferences: NotificationPreferences,
    scheduledNotifications: PrayerNotification[]
  ): Promise<void> {
    const prayers = [
      {
        name: "Fajr",
        beginTime: prayerTime.fajr_begins,
        jamahTime: prayerTime.fajr_jamah,
      },
      {
        name: "Zuhr",
        beginTime: prayerTime.zuhr_begins,
        jamahTime: prayerTime.zuhr_jamah,
      },
      {
        name: "Asr",
        beginTime: prayerTime.asr_mithl_1,
        jamahTime: prayerTime.asr_jamah,
      },
      {
        name: "Maghrib",
        beginTime: prayerTime.maghrib_begins,
        jamahTime: prayerTime.maghrib_jamah,
      },
      {
        name: "Isha",
        beginTime: prayerTime.isha_begins,
        jamahTime: prayerTime.isha_jamah,
      },
    ];

    for (const prayer of prayers) {
      const baseDate = new Date(prayerTime.d_date);

      // Schedule prayer begin time notification
      if (preferences.prayerBeginTimes && prayer.beginTime) {
        await this.schedulePrayerNotification(
          prayer.name,
          "prayer_begin",
          baseDate,
          prayer.beginTime,
          `${prayer.name} prayer time`,
          `It's time for ${prayer.name} prayer`,
          scheduledNotifications
        );
      }

      // Schedule jamah time notifications
      if (
        preferences.jamahTimes &&
        prayer.jamahTime &&
        prayer.jamahTime.trim() !== ""
      ) {
        // Jamah time notification
        await this.schedulePrayerNotification(
          prayer.name,
          "jamah_time",
          baseDate,
          prayer.jamahTime,
          `${prayer.name} Jamah`,
          `${prayer.name} jamah is starting now`,
          scheduledNotifications
        );

        // Jamah reminder notification (X minutes before)
        if (preferences.jamahReminderMinutes > 0) {
          const jamahDate = this.parseNotificationTime(
            baseDate,
            prayer.jamahTime
          );
          const reminderDate = new Date(
            jamahDate.getTime() - preferences.jamahReminderMinutes * 60 * 1000
          );

          if (reminderDate > new Date()) {
            // Only schedule future notifications
            const notificationId = `${prayer.name.toLowerCase()}_jamah_reminder_${
              prayerTime.d_date
            }`;

            await Notifications.scheduleNotificationAsync({
              identifier: notificationId,
              content: {
                title: `${prayer.name} Jamah Reminder`,
                body: `${prayer.name} jamah starts in ${preferences.jamahReminderMinutes} minutes`,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
                categoryIdentifier: "prayer-times",
                data: {
                  prayerName: prayer.name,
                  type: "jamah_reminder",
                  date: prayerTime.d_date,
                },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: reminderDate,
              },
            });

            scheduledNotifications.push({
              id: notificationId,
              type: "jamah_reminder",
              prayerName: prayer.name,
              scheduledDate: prayerTime.d_date,
              scheduledTime: this.formatTime(reminderDate),
              title: `${prayer.name} Jamah Reminder`,
              body: `${prayer.name} jamah starts in ${preferences.jamahReminderMinutes} minutes`,
            });
          }
        }
      }
    }
  }

  private static async schedulePrayerNotification(
    prayerName: string,
    type: "prayer_begin" | "jamah_time",
    baseDate: Date,
    timeString: string,
    title: string,
    body: string,
    scheduledNotifications: PrayerNotification[]
  ): Promise<void> {
    try {
      const notificationDate = this.parseNotificationTime(baseDate, timeString);

      // Only schedule future notifications
      if (notificationDate <= new Date()) {
        return;
      }

      const notificationId = `${prayerName.toLowerCase()}_${type}_${
        baseDate.toISOString().split("T")[0]
      }`;

      await Notifications.scheduleNotificationAsync({
        identifier: notificationId,
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: "prayer-times",
          data: {
            prayerName,
            type,
            date: baseDate.toISOString().split("T")[0],
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: notificationDate,
        },
      });

      scheduledNotifications.push({
        id: notificationId,
        type,
        prayerName,
        scheduledDate: baseDate.toISOString().split("T")[0],
        scheduledTime: this.formatTime(notificationDate),
        title,
        body,
      });
    } catch (error) {
      console.error(
        `Error scheduling ${type} notification for ${prayerName}:`,
        error
      );
    }
  }

  private static parseNotificationTime(
    baseDate: Date,
    timeString: string
  ): Date {
    try {
      const [hours, minutes, seconds = "0"] = timeString.split(":");
      const notificationDate = new Date(baseDate);
      notificationDate.setHours(
        parseInt(hours, 10),
        parseInt(minutes, 10),
        parseInt(seconds, 10),
        0
      );
      return notificationDate;
    } catch (error) {
      console.error("Error parsing notification time:", timeString, error);
      return new Date();
    }
  }

  private static formatTime(date: Date): string {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  static async getScheduledNotifications(): Promise<PrayerNotification[]> {
    try {
      const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading scheduled notifications:", error);
      return [];
    }
  }

  static async scheduleTestNotification(): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: "test_notification",
        content: {
          title: "🕌 Test Notification",
          body: "Your prayer time notifications are working correctly!",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: "prayer-times",
          data: {
            type: "test",
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
        },
      });
    } catch (error) {
      console.error("Error scheduling test notification:", error);
      throw error;
    }
  }

  static async updateNotifications(
    prayerTimes: PrayerTime[],
    preferences: NotificationPreferences
  ): Promise<void> {
    if (preferences.isEnabled) {
      await this.scheduleNotificationsForDays(prayerTimes, preferences);
    } else {
      await this.cancelAllNotifications();
    }
  }
}

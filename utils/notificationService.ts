import { EventNotificationPreference, EventWithId } from "@/types/event";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
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
        // Notification permission denied
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
      // Error requesting notification permissions
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
      // Notification preferences saved
    } catch (error) {
      // Error saving notification preferences
      throw error;
    }
  }

  static async loadPreferences(): Promise<NotificationPreferences> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (stored) {
        const preferences = JSON.parse(stored);

        // Handle migration from old format to new format
        if ("prayerBeginTimes" in preferences) {
          // Old format detected, migrate to new format
          // Migrating old notification preferences format

          const newPreferences: NotificationPreferences = {
            isEnabled: preferences.isEnabled ?? false,
            hasAskedPermission: preferences.hasAskedPermission ?? false,
            prayers: {
              fajr: {
                beginTime: preferences.prayerBeginTimes ?? false,
                jamahTime: preferences.jamahTimes ?? false,
                jamahReminderMinutes: preferences.jamahReminderMinutes ?? 10,
              },
              zuhr: {
                beginTime: preferences.prayerBeginTimes ?? false,
                jamahTime: preferences.jamahTimes ?? false,
                jamahReminderMinutes: preferences.jamahReminderMinutes ?? 10,
              },
              asr: {
                beginTime: preferences.prayerBeginTimes ?? false,
                jamahTime: preferences.jamahTimes ?? false,
                jamahReminderMinutes: preferences.jamahReminderMinutes ?? 10,
              },
              maghrib: {
                beginTime: preferences.prayerBeginTimes ?? false,
                jamahTime: preferences.jamahTimes ?? false,
                jamahReminderMinutes: preferences.jamahReminderMinutes ?? 10,
              },
              isha: {
                beginTime: preferences.prayerBeginTimes ?? false,
                jamahTime: preferences.jamahTimes ?? false,
                jamahReminderMinutes: preferences.jamahReminderMinutes ?? 10,
              },
            },
          };

          // Save migrated preferences
          await this.savePreferences(newPreferences);
          return newPreferences;
        }

        // Ensure all required fields exist
        return {
          isEnabled: preferences.isEnabled ?? false,
          hasAskedPermission: preferences.hasAskedPermission ?? false,
          prayers:
            preferences.prayers ?? DEFAULT_NOTIFICATION_PREFERENCES.prayers,
        };
      }
      return DEFAULT_NOTIFICATION_PREFERENCES;
    } catch (error) {
      // Error loading notification preferences
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  }

  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem(SCHEDULED_NOTIFICATIONS_KEY);
      // All notifications cancelled
    } catch (error) {
      // Error cancelling notifications
    }
  }

  static async scheduleNotificationsForDays(
    prayerTimes: PrayerTime[],
    preferences: NotificationPreferences,
    daysAhead: number = 7
  ): Promise<void> {
    if (!preferences.isEnabled) {
      // Notifications disabled
      return;
    }

    // Check if any prayer has notifications enabled
    const hasAnyEnabled = Object.values(preferences.prayers).some(
      (p) => p.beginTime || p.jamahTime
    );

    if (!hasAnyEnabled) {
      // No prayer notifications enabled
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

      // Scheduled notifications
    } catch (error) {
      // Error scheduling notifications
    }
  }

  private static async scheduleNotificationsForDay(
    prayerTime: PrayerTime,
    preferences: NotificationPreferences,
    scheduledNotifications: PrayerNotification[]
  ): Promise<void> {
    const prayers: Array<{
      name: keyof NotificationPreferences["prayers"];
      displayName: string;
      beginTime: string;
      jamahTime: string;
    }> = [
      {
        name: "fajr",
        displayName: "Fajr",
        beginTime: prayerTime.fajr_begins,
        jamahTime: prayerTime.fajr_jamah,
      },
      {
        name: "zuhr",
        displayName: "Zuhr",
        beginTime: prayerTime.zuhr_begins,
        jamahTime: prayerTime.zuhr_jamah,
      },
      {
        name: "asr",
        displayName: "Asr",
        beginTime: prayerTime.asr_mithl_1,
        jamahTime: prayerTime.asr_jamah,
      },
      {
        name: "maghrib",
        displayName: "Maghrib",
        beginTime: prayerTime.maghrib_begins,
        jamahTime: prayerTime.maghrib_jamah,
      },
      {
        name: "isha",
        displayName: "Isha",
        beginTime: prayerTime.isha_begins,
        jamahTime: prayerTime.isha_jamah,
      },
    ];

    for (const prayer of prayers) {
      const prayerSettings = preferences.prayers[prayer.name];
      if (!prayerSettings) continue;

      const baseDate = new Date(prayerTime.d_date);

      // Schedule prayer begin time notification
      if (prayerSettings.beginTime && prayer.beginTime) {
        await this.schedulePrayerNotification(
          prayer.displayName,
          "prayer_begin",
          baseDate,
          prayer.beginTime,
          `${prayer.displayName} prayer time`,
          `It's time for ${prayer.displayName} prayer`,
          scheduledNotifications
        );
      }

      // Schedule jamah time notifications
      if (
        prayerSettings.jamahTime &&
        prayer.jamahTime &&
        prayer.jamahTime.trim() !== ""
      ) {
        // Jamah time notification
        await this.schedulePrayerNotification(
          prayer.displayName,
          "jamah_time",
          baseDate,
          prayer.jamahTime,
          `${prayer.displayName} Jamah`,
          `${prayer.displayName} jamah is starting now`,
          scheduledNotifications
        );

        // Jamah reminder notification (X minutes before)
        if (prayerSettings.jamahReminderMinutes > 0) {
          const jamahDate = this.parseNotificationTime(
            baseDate,
            prayer.jamahTime
          );
          const reminderDate = new Date(
            jamahDate.getTime() -
              prayerSettings.jamahReminderMinutes * 60 * 1000
          );

          if (reminderDate > new Date()) {
            // Only schedule future notifications
            const notificationId = `${prayer.name}_jamah_reminder_${prayerTime.d_date}`;

            await Notifications.scheduleNotificationAsync({
              identifier: notificationId,
              content: {
                title: `${prayer.displayName} Jamah Reminder`,
                body: `${prayer.displayName} jamah starts in ${prayerSettings.jamahReminderMinutes} minutes`,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
                categoryIdentifier: "prayer-times",
                data: {
                  prayerName: prayer.displayName,
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
              prayerName: prayer.displayName,
              scheduledDate: prayerTime.d_date,
              scheduledTime: this.formatTime(reminderDate),
              title: `${prayer.displayName} Jamah Reminder`,
              body: `${prayer.displayName} jamah starts in ${prayerSettings.jamahReminderMinutes} minutes`,
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
      // Error scheduling notification
      // Type: ${type}, Prayer: ${prayerName}
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
      // Error parsing notification time
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
      // Error loading scheduled notifications
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
      // Error scheduling test notification
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

  // Event notification methods
  static async scheduleEventNotification(
    event: EventWithId,
    preference: EventNotificationPreference
  ): Promise<void> {
    if (!preference.enabled || !event.calculatedStartTime) return;

    try {
      // Cancel existing notification for this event
      await Notifications.cancelScheduledNotificationAsync(`event_${event.id}`);

      const notificationTime = new Date(event.calculatedStartTime);
      notificationTime.setMinutes(
        notificationTime.getMinutes() - preference.minutesBefore
      );

      // Only schedule if notification time is in the future
      if (notificationTime > new Date()) {
        await Notifications.scheduleNotificationAsync({
          identifier: `event_${event.id}`,
          content: {
            title: `🗓️ ${event.header}`,
            body: event.subheader || `Event starts in ${preference.minutesBefore} minutes`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            categoryIdentifier: Platform.OS === "android" ? "events" : undefined,
            data: {
              type: "event",
              eventId: event.id,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: notificationTime,
          },
        });

        // Store that we scheduled this notification
        preference.lastNotificationTime = new Date().toISOString();
      }
    } catch (error) {
      // Error scheduling event notification
    }
  }

  static async cancelEventNotification(eventId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(`event_${eventId}`);
    } catch (error) {
      // Error canceling event notification
    }
  }

  static async scheduleAllEventNotifications(
    events: EventWithId[],
    preferences: EventNotificationPreference[]
  ): Promise<void> {
    for (const event of events) {
      const preference = preferences.find(p => p.eventId === event.id);
      if (preference) {
        await this.scheduleEventNotification(event, preference);
      }
    }
  }
}

export interface NotificationPreferences {
  prayerBeginTimes: boolean;
  jamahTimes: boolean;
  jamahReminderMinutes: number; // Minutes before jamah time
  isEnabled: boolean;
  hasAskedPermission: boolean;
}

export interface PrayerNotification {
  id: string;
  type: "prayer_begin" | "jamah_time" | "jamah_reminder";
  prayerName: string;
  scheduledDate: string;
  scheduledTime: string;
  title: string;
  body: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  prayerBeginTimes: false,
  jamahTimes: false,
  jamahReminderMinutes: 10,
  isEnabled: false,
  hasAskedPermission: false,
};

export interface NotificationPreferences {
  isEnabled: boolean;
  hasAskedPermission: boolean;
  prayers: {
    fajr: PrayerNotificationSettings;
    zuhr: PrayerNotificationSettings;
    asr: PrayerNotificationSettings;
    maghrib: PrayerNotificationSettings;
    isha: PrayerNotificationSettings;
  };
}

export interface PrayerNotificationSettings {
  beginTime: boolean;
  jamahTime: boolean;
  jamahReminderMinutes: number;
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
  isEnabled: false,
  hasAskedPermission: false,
  prayers: {
    fajr: {
      beginTime: false,
      jamahTime: false,
      jamahReminderMinutes: 10,
    },
    zuhr: {
      beginTime: false,
      jamahTime: false,
      jamahReminderMinutes: 10,
    },
    asr: {
      beginTime: false,
      jamahTime: false,
      jamahReminderMinutes: 10,
    },
    maghrib: {
      beginTime: false,
      jamahTime: false,
      jamahReminderMinutes: 10,
    },
    isha: {
      beginTime: false,
      jamahTime: false,
      jamahReminderMinutes: 10,
    },
  },
};

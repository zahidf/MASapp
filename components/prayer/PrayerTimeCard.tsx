import React, { useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  NotificationPreferences,
  PrayerNotificationSettings,
} from "@/types/notification";
import { BlurView } from "expo-blur";
import { SunriseCard } from "./SunriseCard";

// Define the notification prayer type based on your actual prayers object
type NotificationPrayerName = keyof NotificationPreferences["prayers"];

interface PrayerTimeCardProps {
  name: string;
  time: string;
  jamah?: string;
  isActive?: boolean;
  isNext?: boolean;
  pulseAnim?: Animated.Value;
  getCountdownToNext?: () => string;
  hideNotificationToggle?: boolean;
  isSunrise?: boolean;
}

export function PrayerTimeCard({
  name,
  time,
  jamah,
  isActive = false,
  isNext = false,
  pulseAnim,
  getCountdownToNext,
  hideNotificationToggle = false,
  isSunrise = false,
}: PrayerTimeCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { preferences, updatePrayerSettings } = useNotificationContext();
  const [showNotificationSheet, setShowNotificationSheet] = useState(false);

  const getPrayerKey = (): NotificationPrayerName | null => {
    if (!name || typeof name !== "string") return null;

    const lowerName = name.toLowerCase();
    if (lowerName === "sunrise") return null; // No notifications for sunrise

    // Type guard to ensure we only return valid notification prayer names
    const validPrayers: NotificationPrayerName[] = [
      "fajr",
      "zuhr",
      "asr",
      "maghrib",
      "isha",
    ];
    if (validPrayers.includes(lowerName as NotificationPrayerName)) {
      return lowerName as NotificationPrayerName;
    }
    return null;
  };

  const prayerKey = getPrayerKey();
  const notificationSettings = prayerKey
    ? preferences.prayers[prayerKey]
    : null;

  const hasNotificationsEnabled =
    notificationSettings &&
    (notificationSettings.beginTime || notificationSettings.jamahTime);

  const getPrayerIcon = (prayerName: string) => {
    if (!prayerName || typeof prayerName !== "string") return "clock";

    switch (prayerName.toLowerCase()) {
      case "fajr":
        return "sunrise";
      case "sunrise":
        return "sun.max";
      case "zuhr":
        return "sun.max.fill";
      case "asr":
        return "sun.min";
      case "maghrib":
        return "sunset";
      case "isha":
        return "moon.stars";
      default:
        return "clock";
    }
  };

  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return "N/A";
    if (timeString.length === 5 && timeString.includes(":")) {
      return timeString;
    }
    if (timeString.includes(":")) {
      const parts = timeString.split(":");
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`;
      }
    }
    return timeString;
  };

  const handleNotificationPress = () => {
    if (prayerKey) {
      setShowNotificationSheet(true);
    }
  };

  // Return compact SunriseCard for sunrise
  if (isSunrise) {
    return (
      <SunriseCard
        time={time}
        isActive={isActive}
        isNext={isNext}
        pulseAnim={pulseAnim}
        getCountdownToNext={getCountdownToNext}
      />
    );
  }

  const cardOpacity = isActive ? 1 : isNext ? 0.98 : 0.95;
  const cardScale = isActive && pulseAnim ? pulseAnim : 1;

  return (
    <>
      <Animated.View
        style={[
          {
            opacity: cardOpacity,
            transform: [{ scale: cardScale }],
          },
          styles.prayerCardWrapper,
        ]}
      >
        <BlurView
          intensity={isActive ? 100 : isNext ? 90 : 80}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={[
            styles.prayerCard,
            isActive && styles.activePrayerCard,
            isNext && styles.nextPrayerCard,
            {
              backgroundColor: isActive
                ? colors.tint + "20"
                : isNext
                ? colors.tint + "12"
                : colors.surface + "95",
              borderColor: isActive
                ? colors.tint
                : isNext
                ? colors.tint + "60"
                : colorScheme === "dark"
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          <View style={styles.prayerCardContent}>
            {/* Prayer Icon and Name */}
            <View style={styles.prayerHeaderRow}>
              <View
                style={[
                  styles.prayerIconContainer,
                  {
                    backgroundColor: isActive
                      ? colors.tint + "25"
                      : isNext
                      ? colors.tint + "15"
                      : colorScheme === "dark"
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.05)",
                  },
                ]}
              >
                <IconSymbol
                  name={getPrayerIcon(name) as any}
                  size={22}
                  color={
                    isActive
                      ? colors.tint
                      : isNext
                      ? colors.tint
                      : colors.text + "85"
                  }
                />
              </View>

              <View style={styles.prayerNameContainer}>
                <ThemedText
                  style={[
                    styles.prayerName,
                    {
                      color: isActive ? colors.tint : colors.text,
                      fontWeight: isActive || isNext ? "700" : "600",
                    },
                  ]}
                >
                  {name}
                </ThemedText>
                {(isActive || isNext) && (
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: isActive
                          ? colors.tint
                          : colors.tint + "25",
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.statusText,
                        { color: isActive ? "#fff" : colors.tint },
                      ]}
                    >
                      {isActive
                        ? "NOW"
                        : getCountdownToNext
                        ? getCountdownToNext() || "NEXT"
                        : "NEXT"}
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* Notification Toggle - Only show for prayers (not sunrise) and when not hidden */}
              {prayerKey && !hideNotificationToggle && (
                <TouchableOpacity
                  style={[
                    styles.notificationButton,
                    {
                      backgroundColor: hasNotificationsEnabled
                        ? colors.tint + "15"
                        : colorScheme === "dark"
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                  onPress={handleNotificationPress}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <IconSymbol
                    name={hasNotificationsEnabled ? "bell.fill" : "bell"}
                    size={18}
                    color={
                      hasNotificationsEnabled
                        ? colors.tint
                        : colors.text + "60"
                    }
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Time Information */}
            <View style={styles.timeContainer}>
              <View style={styles.timeSection}>
                <ThemedText
                  style={[styles.timeLabel, { color: colors.text + "65" }]}
                >
                  BEGINS
                </ThemedText>
                <ThemedText
                  style={[
                    styles.timeValue,
                    {
                      color: isActive ? colors.tint : colors.text,
                      fontWeight: isActive ? "700" : "600",
                    },
                  ]}
                >
                  {formatTime(time)}
                </ThemedText>
              </View>

              {jamah && jamah.trim() !== "" && name !== "Sunrise" && (
                <>
                  <View
                    style={[
                      styles.timeDivider,
                      { backgroundColor: colors.text + "12" },
                    ]}
                  />
                  <View style={styles.timeSection}>
                    <ThemedText
                      style={[styles.timeLabel, { color: colors.text + "65" }]}
                    >
                      JAMAH
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.timeValue,
                        {
                          color: isActive ? colors.tint : colors.text,
                          fontWeight: isActive ? "700" : "600",
                        },
                      ]}
                    >
                      {formatTime(jamah)}
                    </ThemedText>
                  </View>
                </>
              )}
            </View>
          </View>
        </BlurView>
      </Animated.View>

      {/* Notification Settings Sheet */}
      {prayerKey && notificationSettings && (
        <NotificationSettingsSheet
          visible={showNotificationSheet}
          prayerName={name}
          prayerKey={prayerKey}
          settings={notificationSettings}
          onClose={() => setShowNotificationSheet(false)}
        />
      )}
    </>
  );
}

// Notification Settings Sheet Component
interface NotificationSettingsSheetProps {
  visible: boolean;
  prayerName: string;
  prayerKey: NotificationPrayerName;
  settings: PrayerNotificationSettings;
  onClose: () => void;
}

function NotificationSettingsSheet({
  visible,
  prayerName,
  prayerKey,
  settings,
  onClose,
}: NotificationSettingsSheetProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { updatePrayerSettings } = useNotificationContext();
  const [slideAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const reminderOptions = [5, 10, 15, 20, 30];

  const handleToggleBeginTime = async (value: boolean) => {
    await updatePrayerSettings(prayerKey, {
      ...settings,
      beginTime: value,
    });
  };

  const handleToggleJamahTime = async (value: boolean) => {
    await updatePrayerSettings(prayerKey, {
      ...settings,
      jamahTime: value,
    });
  };

  const handleReminderChange = async (minutes: number) => {
    await updatePrayerSettings(prayerKey, {
      ...settings,
      jamahReminderMinutes: minutes,
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.background,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Sheet Handle */}
          <View style={styles.sheetHandle}>
            <View
              style={[
                styles.sheetHandleBar,
                { backgroundColor: colors.text + "30" },
              ]}
            />
          </View>

          {/* Header */}
          <View style={styles.sheetHeader}>
            <ThemedText style={[styles.sheetTitle, { color: colors.text }]}>
              {prayerName} Notifications
            </ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={20} color={colors.text + "80"} />
            </TouchableOpacity>
          </View>

          {/* Settings */}
          <ThemedView style={styles.settingsList}>
            {/* Prayer Begin Time */}
            <View
              style={[
                styles.settingRow,
                { borderBottomColor: colors.text + "10" },
              ]}
            >
              <View style={styles.settingInfo}>
                <ThemedText
                  style={[styles.settingTitle, { color: colors.text }]}
                >
                  Prayer Begin Time
                </ThemedText>
                <ThemedText
                  style={[
                    styles.settingDescription,
                    { color: colors.text + "60" },
                  ]}
                >
                  Notify when {prayerName} prayer time begins
                </ThemedText>
              </View>
              <Switch
                value={settings.beginTime}
                onValueChange={handleToggleBeginTime}
                trackColor={{
                  false: colors.text + "20",
                  true: colors.tint + "60",
                }}
                thumbColor={settings.beginTime ? colors.tint : "#f4f3f4"}
              />
            </View>

            {/* Jamah Time */}
            <View
              style={[
                styles.settingRow,
                { borderBottomColor: colors.text + "10" },
              ]}
            >
              <View style={styles.settingInfo}>
                <ThemedText
                  style={[styles.settingTitle, { color: colors.text }]}
                >
                  Jamah Time
                </ThemedText>
                <ThemedText
                  style={[
                    styles.settingDescription,
                    { color: colors.text + "60" },
                  ]}
                >
                  Notify when congregation prayer starts
                </ThemedText>
              </View>
              <Switch
                value={settings.jamahTime}
                onValueChange={handleToggleJamahTime}
                trackColor={{
                  false: colors.text + "20",
                  true: colors.tint + "60",
                }}
                thumbColor={settings.jamahTime ? colors.tint : "#f4f3f4"}
              />
            </View>

            {/* Jamah Reminder */}
            {settings.jamahTime && (
              <View style={styles.reminderSection}>
                <ThemedText
                  style={[styles.reminderTitle, { color: colors.text }]}
                >
                  Reminder Before Jamah
                </ThemedText>
                <View style={styles.reminderOptions}>
                  {reminderOptions.map((minutes) => (
                    <TouchableOpacity
                      key={minutes}
                      style={[
                        styles.reminderOption,
                        {
                          backgroundColor:
                            settings.jamahReminderMinutes === minutes
                              ? colors.tint
                              : colors.surface,
                          borderColor:
                            settings.jamahReminderMinutes === minutes
                              ? colors.tint
                              : colors.text + "20",
                        },
                      ]}
                      onPress={() => handleReminderChange(minutes)}
                    >
                      <ThemedText
                        style={[
                          styles.reminderOptionText,
                          {
                            color:
                              settings.jamahReminderMinutes === minutes
                                ? "#fff"
                                : colors.text,
                          },
                        ]}
                      >
                        {minutes}m
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ThemedView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Enhanced prayer cards with better visual hierarchy
  prayerCardWrapper: {
    // Wrapper for enhanced shadow effects
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  prayerCard: {
    borderRadius: 18, // Slightly larger radius for modern look
    overflow: "hidden",
    borderWidth: 1.5,
  },

  activePrayerCard: {
    borderWidth: 2.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },

  nextPrayerCard: {
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },

  prayerCardContent: {
    padding: 18, // Increased padding for better breathing room
  },

  prayerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14, // Increased margin
  },

  prayerIconContainer: {
    width: 40, // Slightly larger
    height: 40,
    borderRadius: 14, // More rounded
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14, // Increased margin
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.04)",
  },

  prayerNameContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  prayerName: {
    fontSize: 18, // Slightly larger
    letterSpacing: -0.4,
  },

  statusBadge: {
    paddingHorizontal: 10, // Increased padding
    paddingVertical: 5,
    borderRadius: 10, // More rounded
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.04)",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.04)",
  },

  // Enhanced time information layout
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 4,
  },

  timeSection: {
    flex: 1,
    alignItems: "center",
  },

  timeDivider: {
    width: 1.5, // Slightly thicker
    height: 44, // Taller
    marginHorizontal: 18, // More spacing
    borderRadius: 1,
  },

  timeLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 5, // Increased margin
  },

  timeValue: {
    fontSize: 24, // Larger for better readability
    letterSpacing: -0.4,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 24,
  },
  sheetHandle: {
    alignItems: "center",
    paddingVertical: 12,
  },
  sheetHandleBar: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  closeButton: {
    padding: 8,
  },
  settingsList: {
    paddingHorizontal: 20,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    letterSpacing: -0.08,
  },
  reminderSection: {
    paddingVertical: 16,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  reminderOptions: {
    flexDirection: "row",
    gap: 8,
  },
  reminderOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 48,
    alignItems: "center",
  },
  reminderOptionText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
export default PrayerTimeCard;

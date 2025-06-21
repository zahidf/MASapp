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

// Define the notification prayer type based on your actual prayers object
type NotificationPrayerName = keyof NotificationPreferences["prayers"];

interface Prayer {
  name: string;
  begins: string;
  jamah?: string;
}

interface PrayerTimeCardProps {
  prayer: Prayer;
  isActive?: boolean;
  isNext?: boolean;
}

export function PrayerTimeCard({
  prayer,
  isActive,
  isNext,
}: PrayerTimeCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { preferences, updatePrayerSettings } = useNotificationContext();
  const [showNotificationSheet, setShowNotificationSheet] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  React.useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isActive]);

  const getPrayerKey = (): NotificationPrayerName | null => {
    const lowerName = prayer.name.toLowerCase();
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

  const getCardStyle = () => {
    const baseStyle = [
      styles.prayerCard,
      {
        backgroundColor: colors.surface,
        borderColor: `${colors.text}10`,
      },
    ];

    if (isActive) {
      return [
        ...baseStyle,
        styles.activePrayerCard,
        {
          backgroundColor: `${colors.primary}15`,
          borderColor: colors.primary,
        },
      ];
    }
    if (isNext) {
      return [
        ...baseStyle,
        styles.nextPrayerCard,
        { borderColor: `${colors.primary}80` },
      ];
    }
    return baseStyle;
  };

  const getTextColor = () => {
    if (isActive) return colors.primary;
    return colors.text;
  };

  const getSecondaryTextColor = () => {
    if (isActive) return `${colors.primary}B3`;
    return `${colors.text}80`;
  };

  const getPrayerIcon = (prayerName: string) => {
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

  const handleNotificationPress = () => {
    if (prayerKey) {
      setShowNotificationSheet(true);
    }
  };

  const handleSaveSettings = async (settings: PrayerNotificationSettings) => {
    if (prayerKey) {
      await updatePrayerSettings(prayerKey, settings);
      setShowNotificationSheet(false);
    }
  };

  return (
    <>
      <Animated.View
        style={[
          getCardStyle(),
          isActive && { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <View style={styles.prayerCardContent}>
          {/* Prayer Icon */}
          <View
            style={[
              styles.prayerIconContainer,
              {
                backgroundColor: isActive
                  ? `${colors.primary}20`
                  : `${colors.text}08`,
              },
            ]}
          >
            <IconSymbol
              name={getPrayerIcon(prayer.name) as any}
              size={24}
              color={isActive ? colors.primary : `${colors.text}60`}
            />
          </View>

          {/* Prayer Info */}
          <View style={styles.prayerInfo}>
            <ThemedText
              style={[
                styles.prayerName,
                {
                  color: getTextColor(),
                  fontWeight: isActive || isNext ? "700" : "600",
                },
              ]}
            >
              {prayer.name}
            </ThemedText>
            <View style={styles.timeInfo}>
              <ThemedText
                style={[styles.prayerTime, { color: getTextColor() }]}
              >
                {prayer.begins}
              </ThemedText>
              {prayer.jamah && prayer.jamah.trim() !== "" && (
                <ThemedText
                  style={[styles.jamahTime, { color: getSecondaryTextColor() }]}
                >
                  Jamah: {prayer.jamah}
                </ThemedText>
              )}
            </View>
          </View>

          {/* Status & Notification */}
          <View style={styles.rightSection}>
            {(isActive || isNext) && (
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isActive
                      ? colors.primary
                      : `${colors.primary}20`,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.statusText,
                    { color: isActive ? "#fff" : colors.primary },
                  ]}
                >
                  {isActive ? "NOW" : "NEXT"}
                </ThemedText>
              </View>
            )}

            {/* Notification Toggle - Only show for prayers (not sunrise) */}
            {prayerKey && (
              <TouchableOpacity
                style={[
                  styles.notificationButton,
                  {
                    backgroundColor: hasNotificationsEnabled
                      ? `${colors.primary}15`
                      : `${colors.text}08`,
                  },
                ]}
                onPress={handleNotificationPress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <IconSymbol
                  name={hasNotificationsEnabled ? "bell.fill" : "bell"}
                  size={20}
                  color={
                    hasNotificationsEnabled
                      ? colors.primary
                      : `${colors.text}40`
                  }
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Notification Settings Sheet */}
      {prayerKey && notificationSettings && (
        <NotificationSettingsSheet
          visible={showNotificationSheet}
          prayerName={prayer.name}
          settings={notificationSettings}
          onSave={handleSaveSettings}
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
  settings: PrayerNotificationSettings;
  onSave: (settings: PrayerNotificationSettings) => void;
  onClose: () => void;
}

function NotificationSettingsSheet({
  visible,
  prayerName,
  settings,
  onSave,
  onClose,
}: NotificationSettingsSheetProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [localSettings, setLocalSettings] = useState(settings);
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

  const handleSave = () => {
    onSave(localSettings);
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
                { backgroundColor: `${colors.text}30` },
              ]}
            />
          </View>

          {/* Header */}
          <View style={styles.sheetHeader}>
            <ThemedText style={[styles.sheetTitle, { color: colors.text }]}>
              {prayerName} Notifications
            </ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={20} color={`${colors.text}80`} />
            </TouchableOpacity>
          </View>

          {/* Settings */}
          <ThemedView style={styles.settingsList}>
            {/* Prayer Begin Time */}
            <View
              style={[
                styles.settingRow,
                { borderBottomColor: `${colors.text}10` },
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
                    { color: `${colors.text}60` },
                  ]}
                >
                  Notify when {prayerName} prayer time begins
                </ThemedText>
              </View>
              <Switch
                value={localSettings.beginTime}
                onValueChange={(value) =>
                  setLocalSettings({ ...localSettings, beginTime: value })
                }
                trackColor={{
                  false: `${colors.text}20`,
                  true: `${colors.primary}60`,
                }}
                thumbColor={
                  localSettings.beginTime ? colors.primary : "#f4f3f4"
                }
              />
            </View>

            {/* Jamah Time */}
            <View
              style={[
                styles.settingRow,
                { borderBottomColor: `${colors.text}10` },
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
                    { color: `${colors.text}60` },
                  ]}
                >
                  Notify when congregation prayer starts
                </ThemedText>
              </View>
              <Switch
                value={localSettings.jamahTime}
                onValueChange={(value) =>
                  setLocalSettings({ ...localSettings, jamahTime: value })
                }
                trackColor={{
                  false: `${colors.text}20`,
                  true: `${colors.primary}60`,
                }}
                thumbColor={
                  localSettings.jamahTime ? colors.primary : "#f4f3f4"
                }
              />
            </View>

            {/* Jamah Reminder */}
            {localSettings.jamahTime && (
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
                            localSettings.jamahReminderMinutes === minutes
                              ? colors.primary
                              : colors.surface,
                          borderColor:
                            localSettings.jamahReminderMinutes === minutes
                              ? colors.primary
                              : `${colors.text}20`,
                        },
                      ]}
                      onPress={() =>
                        setLocalSettings({
                          ...localSettings,
                          jamahReminderMinutes: minutes,
                        })
                      }
                    >
                      <ThemedText
                        style={[
                          styles.reminderOptionText,
                          {
                            color:
                              localSettings.jamahReminderMinutes === minutes
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

          {/* Save Button */}
          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
            >
              <ThemedText style={styles.saveButtonText}>Save</ThemedText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  prayerCard: {
    borderRadius: 16,
    marginVertical: 6,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  activePrayerCard: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  nextPrayerCard: {
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  prayerCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  prayerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: 17,
    marginBottom: 2,
    letterSpacing: -0.4,
  },
  timeInfo: {
    gap: 2,
  },
  prayerTime: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  jamahTime: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: -0.08,
  },
  rightSection: {
    alignItems: "flex-end",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
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
  },
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
  sheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  saveButton: {
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
});

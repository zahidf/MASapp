import React, { useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
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
import { NotificationService } from "@/utils/notificationService";

const REMINDER_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

export function NotificationSettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { preferences, updatePreferences, isLoading, checkPermissionStatus } =
    useNotificationContext();

  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  const handleToggleNotifications = async () => {
    if (!localPreferences.isEnabled) {
      // Enabling notifications - request permission
      const hasPermission = await NotificationService.requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          "Permission Required",
          "Please enable notifications in your device settings to receive prayer time reminders.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }

    const newPreferences = {
      ...localPreferences,
      isEnabled: !localPreferences.isEnabled,
      prayerBeginTimes: !localPreferences.isEnabled
        ? localPreferences.prayerBeginTimes
        : false,
      jamahTimes: !localPreferences.isEnabled
        ? localPreferences.jamahTimes
        : false,
    };

    setLocalPreferences(newPreferences);
    await savePreferences(newPreferences);
  };

  const handleTogglePrayerBeginTimes = async () => {
    const newPreferences = {
      ...localPreferences,
      prayerBeginTimes: !localPreferences.prayerBeginTimes,
    };
    setLocalPreferences(newPreferences);
    await savePreferences(newPreferences);
  };

  const handleToggleJamahTimes = async () => {
    const newPreferences = {
      ...localPreferences,
      jamahTimes: !localPreferences.jamahTimes,
    };
    setLocalPreferences(newPreferences);
    await savePreferences(newPreferences);
  };

  const handleReminderMinutesChange = async (minutes: number) => {
    const newPreferences = {
      ...localPreferences,
      jamahReminderMinutes: minutes,
    };
    setLocalPreferences(newPreferences);
    await savePreferences(newPreferences);
  };

  const savePreferences = async (newPreferences: typeof localPreferences) => {
    try {
      setIsSaving(true);
      await updatePreferences(newPreferences);
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to save notification settings. Please try again."
      );
      setLocalPreferences(preferences); // Revert changes
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      const hasPermission = await checkPermissionStatus();
      if (!hasPermission) {
        Alert.alert(
          "Permission Required",
          "Please enable notifications to test this feature.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      await NotificationService.scheduleTestNotification();
      Alert.alert("Test Sent", "A test notification has been sent!");
    } catch (error) {
      Alert.alert("Error", "Failed to send test notification.");
    }
  };

  const renderPermissionStatus = () => {
    const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
      null
    );

    React.useEffect(() => {
      checkPermissionStatus().then(setPermissionGranted);
    }, []);

    if (permissionGranted === null) return null;

    return (
      <ThemedView
        style={[styles.permissionCard, { backgroundColor: colors.surface }]}
      >
        <View style={styles.permissionHeader}>
          <IconSymbol
            name={
              permissionGranted
                ? "checkmark.circle"
                : "exclamationmark.triangle"
            }
            size={24}
            color={permissionGranted ? "#4CAF50" : "#FF9800"}
          />
          <View style={styles.permissionContent}>
            <ThemedText
              style={[styles.permissionTitle, { color: colors.text }]}
            >
              System Permissions
            </ThemedText>
            <ThemedText
              style={[
                styles.permissionStatus,
                { color: permissionGranted ? "#4CAF50" : "#FF9800" },
              ]}
            >
              {permissionGranted ? "Granted" : "Not Granted"}
            </ThemedText>
          </View>
          {!permissionGranted && (
            <TouchableOpacity
              style={[
                styles.permissionButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => Linking.openSettings()}
            >
              <ThemedText style={styles.permissionButtonText}>
                Settings
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ThemedView>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText
            type="title"
            style={[styles.title, { color: colors.text }]}
          >
            Notification Settings
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: `${colors.text}CC` }]}>
            Customize your prayer time notifications
          </ThemedText>
        </View>

        {/* Permission Status */}
        {renderPermissionStatus()}

        {/* Master Toggle */}
        <ThemedView
          style={[styles.settingCard, { backgroundColor: colors.surface }]}
        >
          <View style={styles.settingHeader}>
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: `${colors.primary}20` },
              ]}
            >
              <IconSymbol name="bell" size={24} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <ThemedText style={[styles.settingTitle, { color: colors.text }]}>
                Enable Notifications
              </ThemedText>
              <ThemedText
                style={[
                  styles.settingDescription,
                  { color: `${colors.text}80` },
                ]}
              >
                Master switch for all prayer time notifications
              </ThemedText>
            </View>
            <Switch
              value={localPreferences.isEnabled}
              onValueChange={handleToggleNotifications}
              disabled={isLoading || isSaving}
              trackColor={{
                false: `${colors.text}30`,
                true: `${colors.primary}60`,
              }}
              thumbColor={
                localPreferences.isEnabled ? colors.primary : "#f4f3f4"
              }
            />
          </View>
        </ThemedView>

        {/* Prayer Begin Times */}
        <ThemedView
          style={[
            styles.settingCard,
            {
              backgroundColor: colors.surface,
              opacity: localPreferences.isEnabled ? 1 : 0.5,
            },
          ]}
        >
          <View style={styles.settingHeader}>
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: `${colors.primary}20` },
              ]}
            >
              <IconSymbol name="sunrise" size={24} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <ThemedText style={[styles.settingTitle, { color: colors.text }]}>
                Prayer Begin Times
              </ThemedText>
              <ThemedText
                style={[
                  styles.settingDescription,
                  { color: `${colors.text}80` },
                ]}
              >
                Get notified when each prayer time begins
              </ThemedText>
            </View>
            <Switch
              value={localPreferences.prayerBeginTimes}
              onValueChange={handleTogglePrayerBeginTimes}
              disabled={!localPreferences.isEnabled || isLoading || isSaving}
              trackColor={{
                false: `${colors.text}30`,
                true: `${colors.primary}60`,
              }}
              thumbColor={
                localPreferences.prayerBeginTimes ? colors.primary : "#f4f3f4"
              }
            />
          </View>
        </ThemedView>

        {/* Jamah Times */}
        <ThemedView
          style={[
            styles.settingCard,
            {
              backgroundColor: colors.surface,
              opacity: localPreferences.isEnabled ? 1 : 0.5,
            },
          ]}
        >
          <View style={styles.settingHeader}>
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: `${colors.primary}20` },
              ]}
            >
              <IconSymbol name="people" size={24} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <ThemedText style={[styles.settingTitle, { color: colors.text }]}>
                Jamah Times
              </ThemedText>
              <ThemedText
                style={[
                  styles.settingDescription,
                  { color: `${colors.text}80` },
                ]}
              >
                Get notified for congregation prayer times
              </ThemedText>
            </View>
            <Switch
              value={localPreferences.jamahTimes}
              onValueChange={handleToggleJamahTimes}
              disabled={!localPreferences.isEnabled || isLoading || isSaving}
              trackColor={{
                false: `${colors.text}30`,
                true: `${colors.primary}60`,
              }}
              thumbColor={
                localPreferences.jamahTimes ? colors.primary : "#f4f3f4"
              }
            />
          </View>

          {/* Reminder Minutes Selection */}
          {localPreferences.jamahTimes && localPreferences.isEnabled && (
            <View style={styles.reminderSection}>
              <ThemedText
                style={[styles.reminderTitle, { color: colors.text }]}
              >
                Advance Reminder
              </ThemedText>
              <ThemedText
                style={[styles.reminderSubtitle, { color: `${colors.text}80` }]}
              >
                Get reminded this many minutes before jamah starts
              </ThemedText>

              <View style={styles.reminderOptions}>
                {REMINDER_OPTIONS.map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.reminderOption,
                      {
                        backgroundColor:
                          localPreferences.jamahReminderMinutes === minutes
                            ? colors.primary
                            : colors.background,
                        borderColor:
                          localPreferences.jamahReminderMinutes === minutes
                            ? colors.primary
                            : `${colors.text}30`,
                      },
                    ]}
                    onPress={() => handleReminderMinutesChange(minutes)}
                    disabled={isLoading || isSaving}
                  >
                    <ThemedText
                      style={[
                        styles.reminderOptionText,
                        {
                          color:
                            localPreferences.jamahReminderMinutes === minutes
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

        {/* Test Notification */}
        {localPreferences.isEnabled && (
          <TouchableOpacity
            style={[styles.testButton, { borderColor: colors.primary }]}
            onPress={handleTestNotification}
            disabled={isLoading || isSaving}
          >
            <IconSymbol
              name="paperplane.fill"
              size={20}
              color={colors.primary}
            />
            <ThemedText
              style={[styles.testButtonText, { color: colors.primary }]}
            >
              Send Test Notification
            </ThemedText>
          </TouchableOpacity>
        )}

        {/* Information Card */}
        <ThemedView
          style={[styles.infoCard, { backgroundColor: `${colors.primary}10` }]}
        >
          <IconSymbol name="info.circle" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <ThemedText style={[styles.infoTitle, { color: colors.primary }]}>
              How It Works
            </ThemedText>
            <ThemedText style={[styles.infoText, { color: colors.text }]}>
              • Notifications are scheduled up to 7 days in advance{"\n"}• They
              automatically update when prayer times change{"\n"}• You can
              modify these settings anytime{"\n"}• Notifications respect your
              device's Do Not Disturb settings
            </ThemedText>
          </View>
        </ThemedView>

        <View style={styles.bottomSpacing} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  permissionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  permissionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  permissionStatus: {
    fontSize: 14,
    fontWeight: "500",
  },
  permissionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  settingCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  settingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  reminderSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  reminderSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  reminderOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  reminderOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 60,
    alignItems: "center",
  },
  reminderOptionText: {
    fontSize: 16,
    fontWeight: "600",
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 20,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
  },
  bottomSpacing: {
    height: 40,
  },
});

import { BlurView } from "expo-blur";
import React, { useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
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
  const [fadeAnim] = useState(new Animated.Value(0));
  const [headerAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  React.useEffect(() => {
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(headerAnim, {
        toValue: 1,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
      <BlurView
        intensity={60}
        tint={colorScheme === "dark" ? "dark" : "light"}
        style={[
          styles.statusCard,
          {
            backgroundColor: colors.surface + "95",
            borderColor: permissionGranted
              ? colors.primary + "30"
              : colors.error + "30",
          },
        ]}
      >
        <View style={styles.statusContent}>
          <View
            style={[
              styles.statusIconContainer,
              {
                backgroundColor: permissionGranted
                  ? colors.primary + "15"
                  : colors.error + "15",
              },
            ]}
          >
            <IconSymbol
              name={
                permissionGranted
                  ? "checkmark.circle.fill"
                  : "exclamationmark.triangle.fill"
              }
              size={24}
              color={permissionGranted ? colors.primary : colors.error}
            />
          </View>
          <View style={styles.statusTextContainer}>
            <ThemedText
              style={[styles.statusTitle, { color: colors.text }]}
            >
              System Permissions
            </ThemedText>
            <ThemedText
              style={[
                styles.statusSubtitle,
                { color: colors.text + "80" },
              ]}
            >
              {permissionGranted
                ? "Notifications are enabled"
                : "Notifications are disabled"}
            </ThemedText>
          </View>
          {!permissionGranted && (
            <TouchableOpacity
              style={[
                styles.statusButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.statusButtonText}>
                Enable
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </BlurView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      {/* Enhanced iOS-style Header with Blur */}
      <Animated.View
        style={[
          styles.headerWrapper,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <BlurView
          intensity={85}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
              Notifications
            </ThemedText>
            <ThemedText style={[styles.headerSubtitle, { color: colors.text + "80" }]}>
              Customize your prayer time reminders
            </ThemedText>
          </View>
        </BlurView>

        {/* Header edge effect */}
        <View style={styles.headerEdgeEffect}>
          <View
            style={[
              styles.headerEdgeGradient,
              {
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(0,0,0,0.2)"
                    : "rgba(0,0,0,0.08)",
              },
            ]}
          />
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Permission Status Card */}
          {renderPermissionStatus()}

          {/* Master Toggle Section */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text + "60" }]}>
              NOTIFICATION SETTINGS
            </ThemedText>

            <BlurView
              intensity={60}
              tint={colorScheme === "dark" ? "dark" : "light"}
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.surface + "95",
                  borderColor:
                    colorScheme === "dark"
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                },
              ]}
            >
              <TouchableOpacity
                style={styles.settingRow}
                onPress={handleToggleNotifications}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <View
                    style={[
                      styles.settingIcon,
                      { backgroundColor: colors.primary + "15" },
                    ]}
                  >
                    <IconSymbol name="bell.fill" size={22} color={colors.primary} />
                  </View>
                  <View style={styles.settingInfo}>
                    <ThemedText style={[styles.settingTitle, { color: colors.text }]}>
                      Enable Notifications
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.settingDescription,
                        { color: colors.text + "60" },
                      ]}
                    >
                      Master switch for all prayer reminders
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={localPreferences.isEnabled}
                  onValueChange={handleToggleNotifications}
                  disabled={isLoading || isSaving}
                  trackColor={{
                    false: colors.text + "20",
                    true: colors.primary + "60",
                  }}
                  thumbColor={
                    localPreferences.isEnabled ? colors.primary : "#f4f3f4"
                  }
                  style={styles.switch}
                />
              </TouchableOpacity>
            </BlurView>
          </View>

          {/* Prayer Notification Types */}
          {localPreferences.isEnabled && (
            <Animated.View
              style={[
                styles.section,
                {
                  opacity: fadeAnim,
                },
              ]}
            >
              <ThemedText style={[styles.sectionTitle, { color: colors.text + "60" }]}>
                PRAYER REMINDERS
              </ThemedText>

              <BlurView
                intensity={60}
                tint={colorScheme === "dark" ? "dark" : "light"}
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: colors.surface + "95",
                    borderColor:
                      colorScheme === "dark"
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                  },
                ]}
              >
                {/* Prayer Begin Times */}
                <TouchableOpacity
                  style={[
                    styles.settingRow,
                    { borderBottomColor: colors.text + "10" },
                  ]}
                  onPress={handleTogglePrayerBeginTimes}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingLeft}>
                    <View
                      style={[
                        styles.settingIcon,
                        { backgroundColor: colors.primary + "15" },
                      ]}
                    >
                      <IconSymbol name="sunrise" size={22} color={colors.primary} />
                    </View>
                    <View style={styles.settingInfo}>
                      <ThemedText style={[styles.settingTitle, { color: colors.text }]}>
                        Prayer Begin Times
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.settingDescription,
                          { color: colors.text + "60" },
                        ]}
                      >
                        Notify when each prayer time begins
                      </ThemedText>
                    </View>
                  </View>
                  <Switch
                    value={localPreferences.prayerBeginTimes}
                    onValueChange={handleTogglePrayerBeginTimes}
                    disabled={!localPreferences.isEnabled || isLoading || isSaving}
                    trackColor={{
                      false: colors.text + "20",
                      true: colors.primary + "60",
                    }}
                    thumbColor={
                      localPreferences.prayerBeginTimes ? colors.primary : "#f4f3f4"
                    }
                    style={styles.switch}
                  />
                </TouchableOpacity>

                {/* Jamah Times */}
                <View>
                  <TouchableOpacity
                    style={[
                      styles.settingRow,
                      localPreferences.jamahTimes && styles.settingRowActive,
                    ]}
                    onPress={handleToggleJamahTimes}
                    activeOpacity={0.7}
                  >
                    <View style={styles.settingLeft}>
                      <View
                        style={[
                          styles.settingIcon,
                          { backgroundColor: colors.secondary + "15" },
                        ]}
                      >
                        <IconSymbol name="people" size={22} color={colors.secondary} />
                      </View>
                      <View style={styles.settingInfo}>
                        <ThemedText style={[styles.settingTitle, { color: colors.text }]}>
                          Jamah Times
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.settingDescription,
                            { color: colors.text + "60" },
                          ]}
                        >
                          Notify for congregation prayers
                        </ThemedText>
                      </View>
                    </View>
                    <Switch
                      value={localPreferences.jamahTimes}
                      onValueChange={handleToggleJamahTimes}
                      disabled={!localPreferences.isEnabled || isLoading || isSaving}
                      trackColor={{
                        false: colors.text + "20",
                        true: colors.primary + "60",
                      }}
                      thumbColor={
                        localPreferences.jamahTimes ? colors.primary : "#f4f3f4"
                      }
                      style={styles.switch}
                    />
                  </TouchableOpacity>

                  {/* Reminder Minutes Selection */}
                  {localPreferences.jamahTimes && localPreferences.isEnabled && (
                    <Animated.View
                      style={[
                        styles.reminderSection,
                        { borderTopColor: colors.text + "10" },
                      ]}
                    >
                      <ThemedText
                        style={[styles.reminderTitle, { color: colors.text }]}
                      >
                        Reminder Before Jamah
                      </ThemedText>
                      <ThemedText
                        style={[styles.reminderSubtitle, { color: colors.text + "60" }]}
                      >
                        Get notified this many minutes before jamah starts
                      </ThemedText>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.reminderScroll}
                        contentContainerStyle={styles.reminderOptions}
                      >
                        {REMINDER_OPTIONS.map((minutes) => (
                          <TouchableOpacity
                            key={minutes}
                            style={[
                              styles.reminderOption,
                              {
                                backgroundColor:
                                  localPreferences.jamahReminderMinutes === minutes
                                    ? colors.primary
                                    : colors.surface,
                                borderColor:
                                  localPreferences.jamahReminderMinutes === minutes
                                    ? colors.primary
                                    : colors.text + "20",
                              },
                            ]}
                            onPress={() => handleReminderMinutesChange(minutes)}
                            disabled={isLoading || isSaving}
                            activeOpacity={0.7}
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
                      </ScrollView>
                    </Animated.View>
                  )}
                </View>
              </BlurView>
            </Animated.View>
          )}

          {/* Test Notification */}
          {localPreferences.isEnabled && (
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.testButton, { borderColor: colors.primary }]}
                onPress={handleTestNotification}
                disabled={isLoading || isSaving}
                activeOpacity={0.8}
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
            </View>
          )}

          {/* Information Card */}
          <View style={styles.section}>
            <BlurView
              intensity={60}
              tint={colorScheme === "dark" ? "dark" : "light"}
              style={[
                styles.infoCard,
                {
                  backgroundColor: colors.primary + "10",
                  borderColor: colors.primary + "20",
                },
              ]}
            >
              <View
                style={[
                  styles.infoIconContainer,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <IconSymbol name="info.circle.fill" size={24} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <ThemedText style={[styles.infoTitle, { color: colors.primary }]}>
                  How It Works
                </ThemedText>
                <ThemedText style={[styles.infoText, { color: colors.text }]}>
                  • Notifications are scheduled up to 7 days in advance{"\n"}
                  • They automatically update when prayer times change{"\n"}
                  • You can modify these settings anytime{"\n"}
                  • Notifications respect your device's Do Not Disturb settings
                </ThemedText>
              </View>
            </BlurView>
          </View>

          <View style={styles.bottomSpacing} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Enhanced iOS-style header
  headerWrapper: {
    backgroundColor: "transparent",
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  header: {
    paddingTop: Platform.OS === "ios" ? 60 : StatusBar.currentHeight || 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  headerEdgeEffect: {
    height: 1,
  },

  headerEdgeGradient: {
    height: 1,
    opacity: 0.15,
  },

  headerContent: {
    gap: 4,
  },

  headerTitle: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: 0.37,
  },

  headerSubtitle: {
    fontSize: 15,
    fontWeight: "400",
    letterSpacing: -0.4,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
  },

  // Permission Status Card
  statusCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },

  statusContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },

  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  statusTextContainer: {
    flex: 1,
  },

  statusTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
    marginBottom: 2,
  },

  statusSubtitle: {
    fontSize: 13,
    letterSpacing: -0.08,
  },

  statusButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },

  statusButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  // Sections
  section: {
    marginBottom: 35,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.08,
    textTransform: "uppercase",
    marginLeft: 32,
    marginBottom: 8,
  },

  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },

  // Setting Rows
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 60,
  },

  settingRowActive: {
    borderBottomWidth: 0,
  },

  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },

  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  settingInfo: {
    flex: 1,
    marginRight: 12,
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

  switch: {
    transform: Platform.OS === "ios" ? [{ scale: 0.85 }] : [],
  },

  // Reminder Section
  reminderSection: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.02)",
  },

  reminderTitle: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
    marginBottom: 4,
  },

  reminderSubtitle: {
    fontSize: 13,
    letterSpacing: -0.08,
    marginBottom: 16,
  },

  reminderScroll: {
    marginHorizontal: -16,
  },

  reminderOptions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },

  reminderOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    minWidth: 56,
    alignItems: "center",
  },

  reminderOptionText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  // Test Button
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
  },

  testButtonText: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },

  // Info Card
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },

  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
    marginBottom: 8,
  },

  infoText: {
    fontSize: 14,
    letterSpacing: -0.2,
    lineHeight: 20,
  },

  bottomSpacing: {
    height: 40,
  },
});
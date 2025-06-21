import React, { useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreferences,
} from "@/types/notification";

interface NotificationSetupModalProps {
  visible: boolean;
  onComplete: (preferences: NotificationPreferences) => void;
  onSkip: () => void;
}

export function NotificationSetupModal({
  visible,
  onComplete,
  onSkip,
}: NotificationSetupModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [currentStep, setCurrentStep] = useState(1);

  // Use dynamic colors based on color scheme
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "#ECEDEE" : "#333333";
  const subtextColor = isDark ? "#BBBBBB" : "#666666";
  const backgroundColor = isDark ? "#151718" : "#FFFFFF";
  const surfaceColor = isDark ? "#2A2A2A" : "#F8F9FA";
  const primaryColor = isDark ? "#81C784" : "#1B5E20";

  const handleComplete = () => {
    const updatedPreferences = {
      ...preferences,
      isEnabled: true,
      hasAskedPermission: true,
    };
    onComplete(updatedPreferences);
  };

  const handleSkip = () => {
    onSkip();
  };

  // Define the notification prayers type based on your actual prayers object
  type NotificationPrayerName = keyof NotificationPreferences["prayers"];

  const togglePrayerSetting = (
    prayer: NotificationPrayerName,
    type: "beginTime" | "jamahTime"
  ) => {
    setPreferences((prev) => ({
      ...prev,
      prayers: {
        ...prev.prayers,
        [prayer]: {
          ...prev.prayers[prayer],
          [type]: !prev.prayers[prayer][type],
        },
      },
    }));
  };

  const toggleAllPrayers = (type: "beginTime" | "jamahTime") => {
    const prayers: NotificationPrayerName[] = [
      "fajr",
      "zuhr",
      "asr",
      "maghrib",
      "isha",
    ];
    const allEnabled = prayers.every((p) => preferences.prayers[p][type]);

    setPreferences((prev) => {
      const updated = { ...prev };
      prayers.forEach((prayer) => {
        updated.prayers[prayer][type] = !allEnabled;
      });
      return updated;
    });
  };

  const hasAnyNotificationEnabled = () => {
    return Object.values(preferences.prayers).some(
      (p) => p.beginTime || p.jamahTime
    );
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2].map((step) => (
        <View
          key={step}
          style={[
            styles.stepDot,
            {
              backgroundColor:
                step <= currentStep ? primaryColor : isDark ? "#555" : "#ccc",
            },
          ]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: isDark ? "#2A2A2A" : "#e8f5e9" },
        ]}
      >
        <Text style={styles.iconText}>🔔</Text>
      </View>

      <Text style={[styles.stepTitle, { color: textColor }]}>
        Stay Connected with Prayer Times
      </Text>

      <Text style={[styles.stepDescription, { color: subtextColor }]}>
        Get notified for prayer times and jamah schedules. You can customize
        notifications for each prayer individually.
      </Text>

      <View style={styles.benefitsList}>
        <View style={styles.benefitItem}>
          <Text style={styles.benefitIcon}>⏰</Text>
          <Text style={[styles.benefitText, { color: textColor }]}>
            Never miss a prayer
          </Text>
        </View>

        <View style={styles.benefitItem}>
          <Text style={styles.benefitIcon}>🎯</Text>
          <Text style={[styles.benefitText, { color: textColor }]}>
            Customize for each prayer
          </Text>
        </View>

        <View style={styles.benefitItem}>
          <Text style={styles.benefitIcon}>⚙️</Text>
          <Text style={[styles.benefitText, { color: textColor }]}>
            Change settings anytime
          </Text>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => {
    const prayers: Array<{ key: NotificationPrayerName; name: string }> = [
      { key: "fajr", name: "Fajr" },
      { key: "zuhr", name: "Zuhr" },
      { key: "asr", name: "Asr" },
      { key: "maghrib", name: "Maghrib" },
      { key: "isha", name: "Isha" },
    ];

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: textColor }]}>
          Choose Your Notifications
        </Text>

        <Text style={[styles.stepDescription, { color: subtextColor }]}>
          Select which prayers you'd like to be notified for
        </Text>

        {/* Quick toggles */}
        <View style={[styles.quickToggles, { backgroundColor: surfaceColor }]}>
          <TouchableOpacity
            style={styles.quickToggle}
            onPress={() => toggleAllPrayers("beginTime")}
          >
            <Text style={[styles.quickToggleText, { color: primaryColor }]}>
              Toggle All Begin Times
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickToggle}
            onPress={() => toggleAllPrayers("jamahTime")}
          >
            <Text style={[styles.quickToggleText, { color: primaryColor }]}>
              Toggle All Jamah Times
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.prayersList}
          showsVerticalScrollIndicator={false}
        >
          {prayers.map((prayer) => (
            <View
              key={prayer.key}
              style={[styles.prayerItem, { backgroundColor: surfaceColor }]}
            >
              <Text style={[styles.prayerName, { color: textColor }]}>
                {prayer.name}
              </Text>

              <View style={styles.prayerToggles}>
                <View style={styles.toggleItem}>
                  <Text style={[styles.toggleLabel, { color: subtextColor }]}>
                    Begin
                  </Text>
                  <Switch
                    value={preferences.prayers[prayer.key].beginTime}
                    onValueChange={() =>
                      togglePrayerSetting(prayer.key, "beginTime")
                    }
                    trackColor={{
                      false: isDark ? "#555" : "#ccc",
                      true: primaryColor,
                    }}
                    thumbColor={
                      preferences.prayers[prayer.key].beginTime
                        ? primaryColor
                        : "#f4f3f4"
                    }
                    style={styles.switch}
                  />
                </View>

                <View style={styles.toggleItem}>
                  <Text style={[styles.toggleLabel, { color: subtextColor }]}>
                    Jamah
                  </Text>
                  <Switch
                    value={preferences.prayers[prayer.key].jamahTime}
                    onValueChange={() =>
                      togglePrayerSetting(prayer.key, "jamahTime")
                    }
                    trackColor={{
                      false: isDark ? "#555" : "#ccc",
                      true: primaryColor,
                    }}
                    thumbColor={
                      preferences.prayers[prayer.key].jamahTime
                        ? primaryColor
                        : "#f4f3f4"
                    }
                    style={styles.switch}
                  />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        {!hasAnyNotificationEnabled() && (
          <View style={[styles.warningBox, { backgroundColor: "#FFF3E0" }]}>
            <Text style={[styles.warningText, { color: "#E65100" }]}>
              ⚠️ No notifications selected. You won't receive any prayer
              reminders.
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContainer, { backgroundColor: backgroundColor }]}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {renderStepIndicator()}

            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
          </ScrollView>

          <View
            style={[
              styles.buttonContainer,
              { borderTopColor: isDark ? "#333" : "#eee" },
            ]}
          >
            {currentStep > 1 && (
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { borderColor: isDark ? "#555" : "#ccc" },
                ]}
                onPress={() => setCurrentStep(currentStep - 1)}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: textColor }]}
                >
                  Back
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.primaryButtons}>
              {currentStep < 2 ? (
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: primaryColor },
                  ]}
                  onPress={() => setCurrentStep(2)}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.skipButton,
                      { borderColor: isDark ? "#555" : "#ccc" },
                    ]}
                    onPress={handleSkip}
                  >
                    <Text
                      style={[styles.skipButtonText, { color: subtextColor }]}
                    >
                      Skip
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      {
                        backgroundColor: hasAnyNotificationEnabled()
                          ? primaryColor
                          : isDark
                          ? "#555"
                          : "#ccc",
                      },
                    ]}
                    onPress={handleComplete}
                    disabled={!hasAnyNotificationEnabled()}
                  >
                    <Text style={styles.primaryButtonText}>
                      Enable Notifications
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    height: "80%",
    minHeight: 500,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    flexDirection: "column",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    minHeight: 400,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    gap: 8,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepContent: {
    alignItems: "center",
    flex: 1,
    minHeight: 300,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  iconText: {
    fontSize: 48,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 30,
  },
  stepDescription: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  benefitsList: {
    width: "100%",
    paddingHorizontal: 16,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 8,
  },
  benefitIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
    textAlign: "center",
  },
  benefitText: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
    lineHeight: 20,
  },
  quickToggles: {
    width: "100%",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 8,
  },
  quickToggle: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  quickToggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
  prayersList: {
    width: "100%",
    maxHeight: 280,
  },
  prayerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  prayerName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  prayerToggles: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  toggleItem: {
    alignItems: "center",
    gap: 4,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  switch: {
    transform: Platform.OS === "ios" ? [{ scaleX: 0.8 }, { scaleY: 0.8 }] : [],
  },
  warningBox: {
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#FFB74D",
  },
  warningText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: "row",
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
    alignItems: "center",
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 80,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButtons: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    minHeight: 50,
    justifyContent: "center",
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 50,
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

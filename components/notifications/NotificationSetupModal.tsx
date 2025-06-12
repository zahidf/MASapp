import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { NotificationPreferences } from "@/types/notification";

interface NotificationSetupModalProps {
  visible: boolean;
  onComplete: (preferences: NotificationPreferences) => void;
  onSkip: () => void;
}

const REMINDER_OPTIONS = [5, 10, 15, 20, 30];

export function NotificationSetupModal({
  visible,
  onComplete,
  onSkip,
}: NotificationSetupModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [prayerBeginTimes, setPrayerBeginTimes] = useState(false);
  const [jamahTimes, setJamahTimes] = useState(false);
  const [jamahReminderMinutes, setJamahReminderMinutes] = useState(10);
  const [currentStep, setCurrentStep] = useState(1);

  // Use dynamic colors based on color scheme
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "#ECEDEE" : "#333333";
  const subtextColor = isDark ? "#BBBBBB" : "#666666";
  const backgroundColor = isDark ? "#151718" : "#FFFFFF";
  const surfaceColor = isDark ? "#2A2A2A" : "#F8F9FA";
  const primaryColor = isDark ? "#81C784" : "#1B5E20";

  console.log("NotificationSetupModal render:", {
    visible,
    currentStep,
    colorScheme,
    isDark,
    textColor,
    backgroundColor,
    surfaceColor,
  });

  const handleComplete = () => {
    const preferences: NotificationPreferences = {
      prayerBeginTimes,
      jamahTimes,
      jamahReminderMinutes,
      isEnabled: prayerBeginTimes || jamahTimes,
      hasAskedPermission: true,
    };
    onComplete(preferences);
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
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
        Get notified for prayer times and jamah schedules to never miss a
        prayer. You can customize these settings anytime in the app.
      </Text>

      <View style={styles.benefitsList}>
        <View style={styles.benefitItem}>
          <Text style={styles.benefitIcon}>⏰</Text>
          <Text style={[styles.benefitText, { color: textColor }]}>
            Timely prayer reminders
          </Text>
        </View>

        <View style={styles.benefitItem}>
          <Text style={styles.benefitIcon}>👥</Text>
          <Text style={[styles.benefitText, { color: textColor }]}>
            Never miss jamah times
          </Text>
        </View>

        <View style={styles.benefitItem}>
          <Text style={styles.benefitIcon}>⚙️</Text>
          <Text style={[styles.benefitText, { color: textColor }]}>
            Fully customizable
          </Text>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: textColor }]}>
        Prayer Begin Times
      </Text>

      <Text style={[styles.stepDescription, { color: subtextColor }]}>
        Get notified when it's time for each prayer (Fajr, Zuhr, Asr, Maghrib,
        Isha)
      </Text>

      <View style={[styles.optionCard, { backgroundColor: surfaceColor }]}>
        <View style={styles.optionHeader}>
          <View
            style={[
              styles.optionIcon,
              { backgroundColor: isDark ? "#2A2A2A" : "#e8f5e9" },
            ]}
          >
            <Text style={styles.iconText}>🌅</Text>
          </View>
          <View style={styles.optionContent}>
            <Text style={[styles.optionTitle, { color: textColor }]}>
              Prayer Time Notifications
            </Text>
            <Text style={[styles.optionSubtitle, { color: subtextColor }]}>
              Get notified at the exact start time of each prayer
            </Text>
          </View>
          <Switch
            value={prayerBeginTimes}
            onValueChange={setPrayerBeginTimes}
            trackColor={{
              false: isDark ? "#555" : "#ccc",
              true: primaryColor,
            }}
            thumbColor={prayerBeginTimes ? primaryColor : "#f4f3f4"}
          />
        </View>
      </View>

      <View
        style={[
          styles.exampleNotification,
          { backgroundColor: isDark ? "#2A2A2A" : "#f0f8f0" },
        ]}
      >
        <Text style={[styles.exampleTitle, { color: primaryColor }]}>
          Example Notification:
        </Text>
        <Text style={[styles.exampleText, { color: subtextColor }]}>
          "🕌 Fajr prayer time - It's time for Fajr prayer"
        </Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: textColor }]}>
        Jamah Notifications
      </Text>

      <Text style={[styles.stepDescription, { color: subtextColor }]}>
        Get notified for congregation prayer times and set advance reminders
      </Text>

      <View style={[styles.optionCard, { backgroundColor: surfaceColor }]}>
        <View style={styles.optionHeader}>
          <View
            style={[
              styles.optionIcon,
              { backgroundColor: isDark ? "#2A2A2A" : "#e8f5e9" },
            ]}
          >
            <Text style={styles.iconText}>👥</Text>
          </View>
          <View style={styles.optionContent}>
            <Text style={[styles.optionTitle, { color: textColor }]}>
              Jamah Time Notifications
            </Text>
            <Text style={[styles.optionSubtitle, { color: subtextColor }]}>
              Get notified when jamah is starting
            </Text>
          </View>
          <Switch
            value={jamahTimes}
            onValueChange={setJamahTimes}
            trackColor={{
              false: isDark ? "#555" : "#ccc",
              true: primaryColor,
            }}
            thumbColor={jamahTimes ? primaryColor : "#f4f3f4"}
          />
        </View>
      </View>

      {jamahTimes && (
        <View
          style={[
            styles.reminderSection,
            { backgroundColor: isDark ? "#2A2A2A" : "#e8f5e9" },
          ]}
        >
          <Text style={[styles.reminderTitle, { color: textColor }]}>
            Advance Reminder
          </Text>
          <Text style={[styles.reminderSubtitle, { color: subtextColor }]}>
            How many minutes before jamah would you like to be reminded?
          </Text>

          <View style={styles.reminderOptions}>
            {REMINDER_OPTIONS.map((minutes) => (
              <TouchableOpacity
                key={minutes}
                style={[
                  styles.reminderOption,
                  {
                    backgroundColor:
                      jamahReminderMinutes === minutes
                        ? primaryColor
                        : isDark
                        ? "#151718"
                        : "#fff",
                    borderColor:
                      jamahReminderMinutes === minutes
                        ? primaryColor
                        : isDark
                        ? "#555"
                        : "#ccc",
                  },
                ]}
                onPress={() => setJamahReminderMinutes(minutes)}
              >
                <Text
                  style={[
                    styles.reminderOptionText,
                    {
                      color:
                        jamahReminderMinutes === minutes ? "#fff" : textColor,
                    },
                  ]}
                >
                  {minutes}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View
            style={[
              styles.exampleNotification,
              { backgroundColor: isDark ? "#333" : "#f0f8f0" },
            ]}
          >
            <Text style={[styles.exampleTitle, { color: primaryColor }]}>
              Example:
            </Text>
            <Text style={[styles.exampleText, { color: subtextColor }]}>
              "🕌 Fajr jamah starts in {jamahReminderMinutes} minutes"
            </Text>
          </View>
        </View>
      )}
    </View>
  );

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
            {currentStep === 3 && renderStep3()}
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
                onPress={prevStep}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: textColor }]}
                >
                  Back
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.primaryButtons}>
              {currentStep < 3 ? (
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: primaryColor },
                  ]}
                  onPress={nextStep}
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
                    onPress={onSkip}
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
                      { backgroundColor: primaryColor },
                    ]}
                    onPress={handleComplete}
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
    height: "80%", // Give it a fixed height
    minHeight: 500, // Ensure minimum height
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    flexDirection: "column", // Ensure proper flex direction
  },
  scrollView: {
    flex: 1, // Take up available space
  },
  scrollContent: {
    padding: 24,
    minHeight: 400, // Ensure content has minimum height
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
    flex: 1, // Allow content to expand
    minHeight: 300, // Ensure minimum content height
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
    lineHeight: 32,
  },
  stepDescription: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  benefitsList: {
    width: "100%",
    gap: 20,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
  },
  benefitIcon: {
    fontSize: 24,
  },
  benefitText: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  optionCard: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  reminderSection: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  reminderSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  reminderOptions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
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
  exampleNotification: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#1B5E20",
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    padding: 24,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    flexShrink: 0, // Don't let buttons shrink
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  primaryButtons: {
    flex: 2,
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

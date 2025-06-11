import React, { useState } from "react";
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
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

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

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

  const handleSkip = () => {
    const preferences: NotificationPreferences = {
      prayerBeginTimes: false,
      jamahTimes: false,
      jamahReminderMinutes: 10,
      isEnabled: false,
      hasAskedPermission: true,
    };
    onSkip();
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

  const canProceed = () => {
    if (currentStep === 1) return true;
    if (currentStep === 2) return true;
    if (currentStep === 3) return !jamahTimes || jamahReminderMinutes > 0;
    return false;
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
                step <= currentStep ? colors.primary : `${colors.text}30`,
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
          { backgroundColor: `${colors.primary}20` },
        ]}
      >
        <IconSymbol name="bell" size={48} color={colors.primary} />
      </View>

      <ThemedText
        type="title"
        style={[styles.stepTitle, { color: colors.text }]}
      >
        Stay Connected with Prayer Times
      </ThemedText>

      <ThemedText
        style={[styles.stepDescription, { color: `${colors.text}CC` }]}
      >
        Get notified for prayer times and jamah schedules to never miss a
        prayer. You can customize these settings anytime in the app.
      </ThemedText>

      <View style={styles.benefitsList}>
        <View style={styles.benefitItem}>
          <IconSymbol name="clock" size={24} color={colors.primary} />
          <ThemedText style={[styles.benefitText, { color: colors.text }]}>
            Timely prayer reminders
          </ThemedText>
        </View>

        <View style={styles.benefitItem}>
          <IconSymbol name="person.3" size={24} color={colors.primary} />
          <ThemedText style={[styles.benefitText, { color: colors.text }]}>
            Never miss jamah times
          </ThemedText>
        </View>

        <View style={styles.benefitItem}>
          <IconSymbol name="gear" size={24} color={colors.primary} />
          <ThemedText style={[styles.benefitText, { color: colors.text }]}>
            Fully customizable
          </ThemedText>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <ThemedText
        type="subtitle"
        style={[styles.stepTitle, { color: colors.text }]}
      >
        Prayer Begin Times
      </ThemedText>

      <ThemedText
        style={[styles.stepDescription, { color: `${colors.text}CC` }]}
      >
        Get notified when it's time for each prayer (Fajr, Zuhr, Asr, Maghrib,
        Isha)
      </ThemedText>

      <View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
        <View style={styles.optionHeader}>
          <View style={styles.optionIcon}>
            <IconSymbol name="sunrise" size={28} color={colors.primary} />
          </View>
          <View style={styles.optionContent}>
            <ThemedText style={[styles.optionTitle, { color: colors.text }]}>
              Prayer Time Notifications
            </ThemedText>
            <ThemedText
              style={[styles.optionSubtitle, { color: `${colors.text}80` }]}
            >
              Get notified at the exact start time of each prayer
            </ThemedText>
          </View>
          <Switch
            value={prayerBeginTimes}
            onValueChange={setPrayerBeginTimes}
            trackColor={{
              false: `${colors.text}30`,
              true: `${colors.primary}60`,
            }}
            thumbColor={prayerBeginTimes ? colors.primary : "#f4f3f4"}
          />
        </View>
      </View>

      <View style={styles.exampleNotification}>
        <ThemedText style={[styles.exampleTitle, { color: colors.primary }]}>
          Example Notification:
        </ThemedText>
        <ThemedText style={[styles.exampleText, { color: `${colors.text}B3` }]}>
          "🕌 Fajr prayer time - It's time for Fajr prayer"
        </ThemedText>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <ThemedText
        type="subtitle"
        style={[styles.stepTitle, { color: colors.text }]}
      >
        Jamah Notifications
      </ThemedText>

      <ThemedText
        style={[styles.stepDescription, { color: `${colors.text}CC` }]}
      >
        Get notified for congregation prayer times and set advance reminders
      </ThemedText>

      <View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
        <View style={styles.optionHeader}>
          <View style={styles.optionIcon}>
            <IconSymbol name="person.3" size={28} color={colors.primary} />
          </View>
          <View style={styles.optionContent}>
            <ThemedText style={[styles.optionTitle, { color: colors.text }]}>
              Jamah Time Notifications
            </ThemedText>
            <ThemedText
              style={[styles.optionSubtitle, { color: `${colors.text}80` }]}
            >
              Get notified when jamah is starting
            </ThemedText>
          </View>
          <Switch
            value={jamahTimes}
            onValueChange={setJamahTimes}
            trackColor={{
              false: `${colors.text}30`,
              true: `${colors.primary}60`,
            }}
            thumbColor={jamahTimes ? colors.primary : "#f4f3f4"}
          />
        </View>
      </View>

      {jamahTimes && (
        <Animated.View
          style={[
            styles.reminderSection,
            { backgroundColor: `${colors.primary}10` },
          ]}
        >
          <ThemedText style={[styles.reminderTitle, { color: colors.text }]}>
            Advance Reminder
          </ThemedText>
          <ThemedText
            style={[styles.reminderSubtitle, { color: `${colors.text}80` }]}
          >
            How many minutes before jamah would you like to be reminded?
          </ThemedText>

          <View style={styles.reminderOptions}>
            {REMINDER_OPTIONS.map((minutes) => (
              <TouchableOpacity
                key={minutes}
                style={[
                  styles.reminderOption,
                  {
                    backgroundColor:
                      jamahReminderMinutes === minutes
                        ? colors.primary
                        : colors.surface,
                    borderColor:
                      jamahReminderMinutes === minutes
                        ? colors.primary
                        : `${colors.text}30`,
                  },
                ]}
                onPress={() => setJamahReminderMinutes(minutes)}
              >
                <ThemedText
                  style={[
                    styles.reminderOptionText,
                    {
                      color:
                        jamahReminderMinutes === minutes ? "#fff" : colors.text,
                    },
                  ]}
                >
                  {minutes}m
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.exampleNotification}>
            <ThemedText
              style={[styles.exampleTitle, { color: colors.primary }]}
            >
              Example:
            </ThemedText>
            <ThemedText
              style={[styles.exampleText, { color: `${colors.text}B3` }]}
            >
              "🕌 Fajr jamah starts in {jamahReminderMinutes} minutes"
            </ThemedText>
          </View>
        </Animated.View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
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

          <View style={styles.buttonContainer}>
            {currentStep > 1 && (
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { borderColor: `${colors.text}30` },
                ]}
                onPress={prevStep}
              >
                <ThemedText
                  style={[styles.secondaryButtonText, { color: colors.text }]}
                >
                  Back
                </ThemedText>
              </TouchableOpacity>
            )}

            <View style={styles.primaryButtons}>
              {currentStep < 3 ? (
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.primary },
                    !canProceed() && styles.disabledButton,
                  ]}
                  onPress={nextStep}
                  disabled={!canProceed()}
                >
                  <ThemedText style={styles.primaryButtonText}>
                    Continue
                  </ThemedText>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.skipButton,
                      { borderColor: `${colors.text}30` },
                    ]}
                    onPress={handleSkip}
                  >
                    <ThemedText
                      style={[
                        styles.skipButtonText,
                        { color: `${colors.text}80` },
                      ]}
                    >
                      Skip
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      { backgroundColor: colors.primary },
                      !canProceed() && styles.disabledButton,
                    ]}
                    onPress={handleComplete}
                    disabled={!canProceed()}
                  >
                    <ThemedText style={styles.primaryButtonText}>
                      Enable Notifications
                    </ThemedText>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Animated.View>
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
    maxHeight: "90%",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
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
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
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
    backgroundColor: "rgba(27, 94, 32, 0.1)",
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
    backgroundColor: "rgba(27, 94, 32, 0.05)",
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
    borderTopColor: "rgba(0, 0, 0, 0.1)",
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
    fontSize: 16,
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
});

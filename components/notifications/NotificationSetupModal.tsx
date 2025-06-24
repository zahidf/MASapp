import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { IconSymbol } from "@/components/ui/IconSymbol";
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function NotificationSetupModal({
  visible,
  onComplete,
  onSkip,
}: NotificationSetupModalProps) {
  console.log("NotificationSetupModal: Rendering with visible:", visible);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPrayer, setSelectedPrayer] = useState<string>("fajr");
  
  // Use useRef for animation values to prevent recreation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Animation value for prayer content
  const prayerContentAnim = useRef(new Animated.Value(1)).current;

  // Handle modal visibility animations
  useEffect(() => {
    if (visible) {
      console.log("NotificationSetupModal: Starting entrance animations");
      // Reset animations
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      
      // Animate modal entrance
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations when modal closes
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleComplete = () => {
    console.log("NotificationSetupModal: Complete button pressed");
    const updatedPreferences = {
      ...preferences,
      isEnabled: true,
      hasAskedPermission: true,
    };
    onComplete(updatedPreferences);
  };

  const handleSkip = () => {
    console.log("NotificationSetupModal: Skip button pressed");
    onSkip();
  };

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

  const animatePrayerChange = (newPrayer: string) => {
    if (newPrayer === selectedPrayer) return;
    
    Animated.sequence([
      Animated.timing(prayerContentAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(prayerContentAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedPrayer(newPrayer);
    });
  };

  const renderStep1 = () => (
    <Animated.View
      style={[
        styles.stepContent,
        {
          opacity: fadeAnim,
          transform: [
            {
              scale: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ],
        },
      ]}
    >
      {/* Hero Icon with Liquid Glass effect */}
      <View style={styles.heroContainer}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: colors.primary + "15",
              borderColor: colors.primary + "30",
            },
          ]}
        >
          <IconSymbol name="bell.fill" size={48} color={colors.primary} />
        </View>
      </View>

      <View style={styles.textContent}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          Never Miss a Prayer
        </Text>
        <Text style={[styles.stepDescription, { color: colors.text + "B3" }]}>
          Get timely reminders for prayer times and jamah schedules. Customize
          notifications for each prayer individually.
        </Text>
      </View>

      {/* Feature Cards with HIG-compliant styling */}
      <View style={styles.featureCards}>
        <View
          style={[
            styles.featureCard,
            {
              backgroundColor: colors.surface + "95",
              borderColor:
                colorScheme === "dark"
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
            },
          ]}
        >
          <View
            style={[
              styles.featureIconContainer,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            <IconSymbol
              name="bell"
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>
              Smart Reminders
            </Text>
            <Text
              style={[styles.featureDescription, { color: colors.text + "80" }]}
            >
              Customizable alerts before each prayer
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.featureCard,
            {
              backgroundColor: colors.surface + "95",
              borderColor:
                colorScheme === "dark"
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
            },
          ]}
        >
          <View
            style={[
              styles.featureIconContainer,
              { backgroundColor: colors.secondary + "15" },
            ]}
          >
            <IconSymbol
              name="people"
              size={20}
              color={colors.secondary}
            />
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>
              Jamah Times
            </Text>
            <Text
              style={[styles.featureDescription, { color: colors.text + "80" }]}
            >
              Join the congregation on time
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderStep2 = () => {
    const prayers: Array<{ key: NotificationPrayerName; name: string; icon: string }> = [
      { key: "fajr", name: "Fajr", icon: "sunrise" },
      { key: "zuhr", name: "Zuhr", icon: "sun.max.fill" },
      { key: "asr", name: "Asr", icon: "sun.min" },
      { key: "maghrib", name: "Maghrib", icon: "sunset" },
      { key: "isha", name: "Isha", icon: "moon.stars" },
    ];

    const currentPrayerData = prayers.find(p => p.key === selectedPrayer)!;

    return (
      <View style={styles.step2Wrapper}>
        {/* Fixed Header */}
        <View style={styles.step2Header}>
          <View style={styles.textContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              Choose Your Notifications
            </Text>
            <Text style={[styles.stepDescription, { color: colors.text + "B3" }]}>
              Select which prayers you'd like to be notified for
            </Text>
          </View>

          {/* Quick Actions with iOS-style grouped appearance */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[
                styles.quickActionButton,
                {
                  backgroundColor: colors.primary + "15",
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => toggleAllPrayers("beginTime")}
              activeOpacity={0.7}
            >
              <IconSymbol name="bell" size={16} color={colors.primary} />
              <Text style={[styles.quickActionText, { color: colors.primary }]}>
                All Prayer Times
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickActionButton,
                {
                  backgroundColor: colors.secondary + "15",
                  borderColor: colors.secondary,
                },
              ]}
              onPress={() => toggleAllPrayers("jamahTime")}
              activeOpacity={0.7}
            >
              <IconSymbol name="people" size={16} color={colors.secondary} />
              <Text style={[styles.quickActionText, { color: colors.secondary }]}>
                All Jamah Times
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Prayer Tabs */}
        <View style={styles.prayerTabs}>
          {prayers.map((prayer) => (
            <TouchableOpacity
              key={prayer.key}
              style={[
                styles.prayerTab,
                selectedPrayer === prayer.key && styles.prayerTabActive,
                selectedPrayer === prayer.key && { borderColor: colors.primary },
              ]}
              onPress={() => animatePrayerChange(prayer.key)}
              activeOpacity={0.7}
            >
              <IconSymbol
                name={prayer.icon as any}
                size={20}
                color={selectedPrayer === prayer.key ? colors.primary : colors.text + "60"}
              />
              <Text
                style={[
                  styles.prayerTabText,
                  { color: selectedPrayer === prayer.key ? colors.primary : colors.text + "60" },
                ]}
              >
                {prayer.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Selected Prayer Content */}
        <Animated.View
          style={[
            styles.prayerContent,
            {
              opacity: prayerContentAnim,
              transform: [
                {
                  scale: prayerContentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.selectedPrayerCard,
              {
                backgroundColor: colors.surface + "95",
                borderColor:
                  colorScheme === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
              },
            ]}
          >
            <View style={styles.selectedPrayerHeader}>
              <View
                style={[
                  styles.selectedPrayerIcon,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <IconSymbol
                  name={currentPrayerData.icon as any}
                  size={32}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.selectedPrayerName, { color: colors.text }]}>
                {currentPrayerData.name} Prayer
              </Text>
            </View>

            <View style={styles.notificationOptions}>
              <TouchableOpacity
                style={[
                  styles.notificationOption,
                  preferences.prayers[selectedPrayer as NotificationPrayerName].beginTime && {
                    backgroundColor: colors.primary + "10",
                    borderColor: colors.primary + "30",
                  },
                ]}
                onPress={() => togglePrayerSetting(selectedPrayer as NotificationPrayerName, "beginTime")}
                activeOpacity={0.7}
              >
                <View style={styles.notificationOptionContent}>
                  <IconSymbol
                    name="bell"
                    size={22}
                    color={preferences.prayers[selectedPrayer as NotificationPrayerName].beginTime ? colors.primary : colors.text + "60"}
                  />
                  <View style={styles.notificationOptionText}>
                    <Text style={[styles.notificationOptionTitle, { color: colors.text }]}>
                      Prayer Time
                    </Text>
                    <Text style={[styles.notificationOptionDescription, { color: colors.text + "80" }]}>
                      Notify when prayer begins
                    </Text>
                  </View>
                </View>
                <Switch
                  value={preferences.prayers[selectedPrayer as NotificationPrayerName].beginTime}
                  onValueChange={() => togglePrayerSetting(selectedPrayer as NotificationPrayerName, "beginTime")}
                  trackColor={{
                    false: colors.text + "20",
                    true: colors.primary + "60",
                  }}
                  thumbColor={
                    preferences.prayers[selectedPrayer as NotificationPrayerName].beginTime
                      ? colors.primary
                      : "#f4f3f4"
                  }
                  style={styles.switch}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.notificationOption,
                  preferences.prayers[selectedPrayer as NotificationPrayerName].jamahTime && {
                    backgroundColor: colors.secondary + "10",
                    borderColor: colors.secondary + "30",
                  },
                ]}
                onPress={() => togglePrayerSetting(selectedPrayer as NotificationPrayerName, "jamahTime")}
                activeOpacity={0.7}
              >
                <View style={styles.notificationOptionContent}>
                  <IconSymbol
                    name="people"
                    size={22}
                    color={preferences.prayers[selectedPrayer as NotificationPrayerName].jamahTime ? colors.secondary : colors.text + "60"}
                  />
                  <View style={styles.notificationOptionText}>
                    <Text style={[styles.notificationOptionTitle, { color: colors.text }]}>
                      Jamah Time
                    </Text>
                    <Text style={[styles.notificationOptionDescription, { color: colors.text + "80" }]}>
                      Notify for jamaah
                    </Text>
                  </View>
                </View>
                <Switch
                  value={preferences.prayers[selectedPrayer as NotificationPrayerName].jamahTime}
                  onValueChange={() => togglePrayerSetting(selectedPrayer as NotificationPrayerName, "jamahTime")}
                  trackColor={{
                    false: colors.text + "20",
                    true: colors.secondary + "60",
                  }}
                  thumbColor={
                    preferences.prayers[selectedPrayer as NotificationPrayerName].jamahTime
                      ? colors.secondary
                      : "#f4f3f4"
                  }
                  style={styles.switch}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Warning Box - Fixed at bottom */}
        {!hasAnyNotificationEnabled() && (
          <View
            style={[
              styles.warningBox,
              {
                backgroundColor: colors.error + "15",
                borderColor: colors.error + "30",
              },
            ]}
          >
            <IconSymbol
              name="exclamationmark.triangle"
              size={16}
              color={colors.error}
            />
            <Text style={[styles.warningText, { color: colors.error }]}>
              No notifications selected. You won't receive any prayer reminders.
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (!visible) {
    console.log("NotificationSetupModal: Not visible, returning null");
    return null;
  }

  console.log("NotificationSetupModal: Rendering modal");

  return (
    <Modal
      visible={visible}
      animationType="none" // We'll handle animation ourselves
      transparent={true}
      statusBarTranslucent={true}
      presentationStyle="overFullScreen"
      onRequestClose={onSkip}
      onShow={() => console.log("NotificationSetupModal: Modal onShow called")}
    >
      <TouchableWithoutFeedback onPress={onSkip}>
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  backgroundColor: colors.background,
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [100, 0],
                      }),
                    },
                    {
                      scale: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* iOS-style handle */}
              <View style={styles.handleContainer}>
                <View
                  style={[styles.handle, { backgroundColor: colors.text + "30" }]}
                />
              </View>

              {/* Progress Indicator */}
              <View style={styles.progressContainer}>
                {[1, 2].map((step) => (
                  <View
                    key={step}
                    style={[
                      styles.progressDot,
                      {
                        backgroundColor:
                          step <= currentStep
                            ? colors.primary
                            : colors.text + "20",
                        width: step === currentStep ? 24 : 8,
                      },
                    ]}
                  />
                ))}
              </View>

              {/* Content */}
              <View style={styles.contentContainer}>
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
              </View>

              {/* iOS-style Button Bar */}
              <View
                style={[
                  styles.buttonBar,
                  {
                    borderTopColor: colors.text + "10",
                    backgroundColor: colors.background,
                  },
                ]}
              >
                <View style={styles.buttonContainer}>
                  {currentStep === 1 ? (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.button,
                          styles.secondaryButton,
                          { borderColor: colors.text + "20" },
                        ]}
                        onPress={handleSkip}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.secondaryButtonText,
                            { color: colors.text + "80" },
                          ]}
                        >
                          Skip
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.button,
                          styles.primaryButton,
                          { backgroundColor: colors.primary },
                        ]}
                        onPress={() => setCurrentStep(2)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.primaryButtonText}>Continue</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.button,
                          styles.tertiaryButton,
                        ]}
                        onPress={() => setCurrentStep(1)}
                        activeOpacity={0.7}
                      >
                        <IconSymbol
                          name="chevron.left"
                          size={20}
                          color={colors.primary}
                        />
                        <Text
                          style={[styles.tertiaryButtonText, { color: colors.primary }]}
                        >
                          Back
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.rightButtons}>
                        <TouchableOpacity
                          style={[
                            styles.button,
                            styles.secondaryButton,
                            { borderColor: colors.text + "20" },
                          ]}
                          onPress={handleSkip}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.secondaryButtonText,
                              { color: colors.text + "80" },
                            ]}
                          >
                            Not Now
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.button,
                            styles.primaryButton,
                            {
                              backgroundColor: hasAnyNotificationEnabled()
                                ? colors.primary
                                : colors.text + "20",
                            },
                          ]}
                          onPress={handleComplete}
                          disabled={!hasAnyNotificationEnabled()}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.primaryButtonText,
                              {
                                opacity: hasAnyNotificationEnabled() ? 1 : 0.5,
                              },
                            ]}
                          >
                            Enable
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  modalContainer: {
    width: "100%",
    maxWidth: 400,
    height: "85%",
    maxHeight: 720,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },

  // iOS-style handle
  handleContainer: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },

  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },

  // Progress Indicator
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 6,
  },

  progressDot: {
    height: 8,
    borderRadius: 4,
  },

  // Content
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },

  stepContent: {
    flex: 1,
  },

  // Step 2 wrapper to handle layout properly
  step2Wrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },

  // Hero Section
  heroContainer: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },

  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },

  // Text Content
  textContent: {
    alignItems: "center",
    marginBottom: 24,
  },

  stepTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.37,
    textAlign: "center",
    marginBottom: 8,
  },

  stepDescription: {
    fontSize: 17,
    letterSpacing: -0.4,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },

  // Feature Cards
  featureCards: {
    gap: 12,
    marginBottom: 20,
  },

  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },

  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  featureTextContainer: {
    flex: 1,
  },

  featureTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
    marginBottom: 2,
  },

  featureDescription: {
    fontSize: 13,
    letterSpacing: -0.08,
  },

  // Step 2 Header
  step2Header: {
    marginBottom: 16,
  },

  // Quick Actions
  quickActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },

  quickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },

  quickActionText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  // Prayer Tabs
  prayerTabs: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 8,
  },

  prayerTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },

  prayerTabActive: {
    borderWidth: 1.5,
  },

  prayerTabText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: -0.08,
    marginTop: 4,
  },

  // Prayer Content
  prayerContent: {
    flex: 1,
  },

  selectedPrayerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },

  selectedPrayerHeader: {
    alignItems: "center",
    marginBottom: 16,
  },

  selectedPrayerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  selectedPrayerName: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 0.35,
  },

  notificationOptions: {
    gap: 10,
  },

  notificationOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },

  notificationOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  notificationOptionText: {
    flex: 1,
  },

  notificationOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
    marginBottom: 1,
  },

  notificationOptionDescription: {
    fontSize: 12,
    letterSpacing: -0.08,
    lineHeight: 16,
  },

  switch: {
    transform: Platform.OS === "ios" ? [{ scale: 0.8 }] : [],
  },

  // Warning Box
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
  },

  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: -0.08,
    lineHeight: 18,
  },

  // iOS-style Button Bar
  buttonBar: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  rightButtons: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },

  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },

  primaryButton: {
    minWidth: 100,
  },

  secondaryButton: {
    borderWidth: 1.5,
    minWidth: 90,
  },

  tertiaryButton: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 16,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },

  secondaryButtonText: {
    fontSize: 17,
    fontWeight: "400",
    letterSpacing: -0.4,
  },

  tertiaryButtonText: {
    fontSize: 17,
    fontWeight: "400",
    letterSpacing: -0.4,
  },
});
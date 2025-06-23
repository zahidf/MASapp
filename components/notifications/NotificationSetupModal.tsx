import { BlurView } from "expo-blur";
import React, { useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  const [slideAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  // Animation values for prayer items
  const [prayerAnimations] = useState(() =>
    ["fajr", "zuhr", "asr", "maghrib", "isha"].map(
      () => new Animated.Value(0)
    )
  );

  React.useEffect(() => {
    if (visible) {
      // Reset animations when modal becomes visible
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      
      // Animate modal entrance
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
          delay: 100, // Small delay to ensure modal is ready
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          delay: 100,
        }),
      ]).start();

      // Animate prayer items in sequence on step 2
      if (currentStep === 2) {
        Animated.stagger(
          50,
          prayerAnimations.map((anim) =>
            Animated.spring(anim, {
              toValue: 1,
              tension: 65,
              friction: 10,
              useNativeDriver: true,
            })
          )
        ).start();
      }
    }
  }, [visible, currentStep]);

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
        <BlurView
          intensity={100}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={[
            styles.iconContainer,
            {
              backgroundColor: colors.primary + "15",
              borderColor: colors.primary + "30",
            },
          ]}
        >
          <IconSymbol name="bell.fill" size={48} color={colors.primary} />
        </BlurView>
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
        <BlurView
          intensity={40}
          tint={colorScheme === "dark" ? "dark" : "light"}
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
        </BlurView>

        <BlurView
          intensity={40}
          tint={colorScheme === "dark" ? "dark" : "light"}
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
        </BlurView>
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

    return (
      <Animated.View
        style={[
          styles.stepContent,
          {
            opacity: fadeAnim,
          },
        ]}
      >
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

        {/* Prayer List with iOS-style cells */}
        <ScrollView
          style={styles.prayersList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.prayersListContent}
        >
          {prayers.map((prayer, index) => (
            <Animated.View
              key={prayer.key}
              style={[
                {
                  opacity: prayerAnimations[index],
                  transform: [
                    {
                      translateY: prayerAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <BlurView
                intensity={60}
                tint={colorScheme === "dark" ? "dark" : "light"}
                style={[
                  styles.prayerItem,
                  {
                    backgroundColor: colors.surface + "95",
                    borderColor:
                      colorScheme === "dark"
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                  },
                ]}
              >
                <View style={styles.prayerItemLeft}>
                  <View
                    style={[
                      styles.prayerIconContainer,
                      { backgroundColor: colors.primary + "15" },
                    ]}
                  >
                    <IconSymbol
                      name={prayer.icon as any}
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={[styles.prayerName, { color: colors.text }]}>
                    {prayer.name}
                  </Text>
                </View>

                <View style={styles.prayerToggles}>
                  <View style={styles.toggleItem}>
                    <Text style={[styles.toggleLabel, { color: colors.text + "80" }]}>
                      Begin
                    </Text>
                    <Switch
                      value={preferences.prayers[prayer.key].beginTime}
                      onValueChange={() =>
                        togglePrayerSetting(prayer.key, "beginTime")
                      }
                      trackColor={{
                        false: colors.text + "20",
                        true: colors.primary + "60",
                      }}
                      thumbColor={
                        preferences.prayers[prayer.key].beginTime
                          ? colors.primary
                          : "#f4f3f4"
                      }
                      style={styles.switch}
                    />
                  </View>

                  <View style={[styles.toggleDivider, { backgroundColor: colors.text + "10" }]} />

                  <View style={styles.toggleItem}>
                    <Text style={[styles.toggleLabel, { color: colors.text + "80" }]}>
                      Jamah
                    </Text>
                    <Switch
                      value={preferences.prayers[prayer.key].jamahTime}
                      onValueChange={() =>
                        togglePrayerSetting(prayer.key, "jamahTime")
                      }
                      trackColor={{
                        false: colors.text + "20",
                        true: colors.primary + "60",
                      }}
                      thumbColor={
                        preferences.prayers[prayer.key].jamahTime
                          ? colors.primary
                          : "#f4f3f4"
                      }
                      style={styles.switch}
                    />
                  </View>
                </View>
              </BlurView>
            </Animated.View>
          ))}
        </ScrollView>

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
      </Animated.View>
    );
  };

  // Don't render anything if not visible
  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      presentationStyle="overFullScreen"
      onRequestClose={onSkip}
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFillObject} 
          activeOpacity={1} 
          onPress={onSkip}
        />
        <Animated.View
          style={[
            styles.modalContainer,
            {
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
          <BlurView
            intensity={90}
            tint={colorScheme === "dark" ? "dark" : "light"}
            style={[
              styles.modalContent,
              { backgroundColor: colors.background + "F5" },
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
            <BlurView
              intensity={85}
              tint={colorScheme === "dark" ? "dark" : "light"}
              style={[
                styles.buttonBar,
                {
                  borderTopColor: colors.text + "10",
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
            </BlurView>
          </BlurView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modalContainer: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },

  modalContent: {
    flex: 1,
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

  // Prayer List
  prayersList: {
    flex: 1,
    marginBottom: 12,
  },

  prayersListContent: {
    gap: 12,
    paddingBottom: 12,
  },

  prayerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },

  prayerItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  prayerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  prayerName: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },

  prayerToggles: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  toggleItem: {
    alignItems: "center",
    gap: 4,
  },

  toggleLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: -0.08,
    textTransform: "uppercase",
  },

  toggleDivider: {
    width: 1,
    height: 32,
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
  },

  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: -0.08,
    lineHeight: 18,
  },

  // Button Bar - iOS Style
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
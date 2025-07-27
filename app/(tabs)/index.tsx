import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { BlurView } from "expo-blur";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";


import { PrayerTimesDisplay } from "@/components/prayer/PrayerTimesDisplay";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { PrayerName, PrayerTime } from "@/types/prayer";
import {
  getCurrentPrayerAndNext,
  getMonthName,
  getTodayString,
  parseTimeString,
} from "@/utils/dateHelpers";
import { getCurrentHijriDate, formatHijriDate } from "@/utils/hijriDateUtils";
import { localizeNumbers } from "@/utils/numberLocalization";
import { NotificationService } from "@/utils/notificationService";
import { generatePDFHTML } from "@/utils/pdfGenerator";
import { firebaseMosqueDetailsService } from "@/services/firebaseMosqueDetails";
import { HomePageEvents } from "@/components/events/HomePageEvents";

const { width, height } = Dimensions.get("window");

type ViewMode = "daily" | "monthly";

export default function TodayScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { t } = useLanguage();
  const { prayerTimes, refreshData, isLoading } = usePrayerTimes();
  const { preferences, updatePreferences, checkPermissionStatus, showSetupModal } =
    useNotificationContext();
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [todaysPrayers, setTodaysPrayers] = useState<PrayerTime | null>(null);
  const [currentPrayer, setCurrentPrayer] = useState<PrayerName | null>(null);
  const [nextPrayer, setNextPrayer] = useState<PrayerName | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [monthData, setMonthData] = useState<PrayerTime[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [notificationSlideAnim] = useState(new Animated.Value(0));

  const today = getTodayString();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Helper function to format time to hh:mm
  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return "N/A";
    let formattedTime = timeString;
    
    if (timeString.includes(":")) {
      const parts = timeString.split(":");
      if (parts.length >= 2) {
        formattedTime = `${parts[0]}:${parts[1]}`;
      }
    }
    
    // Localize the numbers based on current language
    return localizeNumbers(formattedTime, t.languageCode || 'en');
  };

  // Countdown calculation function
  const getCountdownToNext = (): string => {
    if (!todaysPrayers || !nextPrayer) return "";

    const prayerTimes = {
      fajr: todaysPrayers.fajr_begins,
      sunrise: todaysPrayers.sunrise,
      zuhr: todaysPrayers.zuhr_begins,
      asr: todaysPrayers.asr_mithl_1,
      maghrib: todaysPrayers.maghrib_begins,
      isha: todaysPrayers.isha_begins,
    };

    const nextPrayerTime = prayerTimes[nextPrayer];
    if (!nextPrayerTime) return "";

    const now = new Date();
    const nextTime = parseTimeString(nextPrayerTime);

    if (nextTime < now) {
      nextTime.setDate(nextTime.getDate() + 1);
    }

    const diff = nextTime.getTime() - now.getTime();

    if (diff <= 0) return t.prayers.now;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${localizeNumbers(hours, t.languageCode || 'en')}${t.common.hours.charAt(0)} ${localizeNumbers(minutes, t.languageCode || 'en')}${t.common.minutes.charAt(0)}`;
    } else {
      return `${localizeNumbers(minutes, t.languageCode || 'en')}${t.common.minutes.charAt(0)}`;
    }
  };

  // Logo image source
  const mosqueLogoSource = require("@/assets/logos/mosqueLogo.png");

  // Keep all your existing useEffect hooks exactly the same
  useEffect(() => {
    if (!prayerTimes || prayerTimes.length === 0) {
      setMonthData([]);
      return;
    }

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-01`;
    const monthEnd = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-${String(daysInMonth).padStart(2, "0")}`;

    const filtered = prayerTimes
      .filter((pt) => {
        if (!pt || !pt.d_date) return false;
        const isInRange = pt.d_date >= monthStart && pt.d_date <= monthEnd;
        return isInRange;
      })
      .sort((a, b) => a.d_date.localeCompare(b.d_date));

    setMonthData(filtered);
  }, [prayerTimes, currentMonth, currentYear]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

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
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateTodaysPrayers = () => {
      if (!Array.isArray(prayerTimes) || prayerTimes.length === 0) {
        setTodaysPrayers(null);
        return;
      }

      const todayData = prayerTimes.find((pt) => pt && pt.d_date === today);

      if (todayData && typeof todayData === "object") {
        setTodaysPrayers(todayData);

        try {
          const { current, next } = getCurrentPrayerAndNext(todayData);
          setCurrentPrayer(current);
          setNextPrayer(next);
        } catch (error) {
          // Error getting current prayer
          setCurrentPrayer(null);
          setNextPrayer("fajr");
        }
      } else {
        setTodaysPrayers(null);
      }
    };

    updateTodaysPrayers();
    const interval = setInterval(updateTodaysPrayers, 60000);
    return () => clearInterval(interval);
  }, [prayerTimes, today]);

  // Show quick actions with animation
  useEffect(() => {
    if (todaysPrayers) {
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  }, [todaysPrayers]);

  // Show notification card with animation
  useEffect(() => {
    if (todaysPrayers && !preferences.hasAskedPermission) {
      setTimeout(() => {
        Animated.spring(notificationSlideAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }).start();
      }, 1000);
    }
  }, [todaysPrayers, preferences.hasAskedPermission]);

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatCurrentDate = () => {
    return currentTime.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrentHijriDate = () => {
    const hijriDate = getCurrentHijriDate();
    return formatHijriDate(hijriDate, t.languageCode || 'en', t);
  };

  const handlePrint = async () => {
    setIsExporting(true);

    try {
      if (monthData.length === 0) {
        Alert.alert(t.common.error, t.home.noDataToPrint);
        setIsExporting(false);
        return;
      }

      // Fetch mosque details and Jumaah times
      const [mosqueDetails, jumaahTimes] = await Promise.all([
        firebaseMosqueDetailsService.getMosqueDetails(),
        firebaseMosqueDetailsService.getJumaahTimes()
      ]);

      const html = await generatePDFHTML(monthData, "month", 'gregorian', mosqueDetails || undefined, jumaahTimes || undefined);
      const filename = `prayer-times-${getMonthName(
        currentMonth
      )}-${currentYear}.pdf`;

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (Platform.OS === "ios") {
        await Sharing.shareAsync(uri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
        });
      } else {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share Prayer Times PDF",
        });
      }
    } catch (error) {
      // Error generating PDF
      Alert.alert(t.common.error, t.home.failedToGeneratePDF);
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleAllBeginTimes = async () => {
    const hasPermission = await checkPermissionStatus();
    if (!hasPermission && !preferences.isEnabled) {
      const granted = await NotificationService.requestPermissions();
      if (!granted) {
        Alert.alert(
          t.notifications.permissionRequired,
          t.notifications.enableNotificationsMessage,
          [
            { text: t.common.cancel, style: "cancel" },
            { text: t.notifications.openSettings, onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }

    // If some but not all are enabled, enable all. Otherwise toggle all
    const shouldEnableAll = !allBeginTimesEnabled;

    const newPreferences = {
      ...preferences,
      isEnabled: true,
      prayers: {
        fajr: { ...preferences.prayers.fajr, beginTime: shouldEnableAll },
        zuhr: { ...preferences.prayers.zuhr, beginTime: shouldEnableAll },
        asr: { ...preferences.prayers.asr, beginTime: shouldEnableAll },
        maghrib: { ...preferences.prayers.maghrib, beginTime: shouldEnableAll },
        isha: { ...preferences.prayers.isha, beginTime: shouldEnableAll },
      },
    };

    // Check if any notifications are still enabled
    const hasAnyEnabled = Object.values(newPreferences.prayers).some(
      (p) => p.beginTime || p.jamahTime
    );

    if (!hasAnyEnabled) {
      newPreferences.isEnabled = false;
    }

    await updatePreferences(newPreferences);
  };

  const handleToggleAllJamahTimes = async () => {
    const hasPermission = await checkPermissionStatus();
    if (!hasPermission && !preferences.isEnabled) {
      const granted = await NotificationService.requestPermissions();
      if (!granted) {
        Alert.alert(
          t.notifications.permissionRequired,
          t.notifications.enableNotificationsMessage,
          [
            { text: t.common.cancel, style: "cancel" },
            { text: t.notifications.openSettings, onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }

    // If some but not all are enabled, enable all. Otherwise toggle all
    const shouldEnableAll = !allJamahTimesEnabled;

    const newPreferences = {
      ...preferences,
      isEnabled: true,
      prayers: {
        fajr: { ...preferences.prayers.fajr, jamahTime: shouldEnableAll },
        zuhr: { ...preferences.prayers.zuhr, jamahTime: shouldEnableAll },
        asr: { ...preferences.prayers.asr, jamahTime: shouldEnableAll },
        maghrib: { ...preferences.prayers.maghrib, jamahTime: shouldEnableAll },
        isha: { ...preferences.prayers.isha, jamahTime: shouldEnableAll },
      },
    };

    // Check if any notifications are still enabled
    const hasAnyEnabled = Object.values(newPreferences.prayers).some(
      (p) => p.beginTime || p.jamahTime
    );

    if (!hasAnyEnabled) {
      newPreferences.isEnabled = false;
    }

    await updatePreferences(newPreferences);
  };

  if (!Array.isArray(prayerTimes) || prayerTimes.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        />

        {/* Enhanced Header with Logo */}
        <View style={styles.headerWrapper}>
          <BlurView
            intensity={85}
            tint={colorScheme === "dark" ? "dark" : "light"}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerMainRow}>
                <View style={styles.headerTextSection}>
                  <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {t.home.today}
                  </Text>
                  <Text
                    style={[
                      styles.headerSubtitle,
                      { color: colors.text + "80" },
                    ]}
                  >
                    {formatCurrentDate()}
                  </Text>
                  <Text
                    style={[styles.headerHijriDate, { color: colors.text + "60" }]}
                  >
                    {formatCurrentHijriDate()}
                  </Text>
                </View>

                {/* Mosque Logo */}
                <View style={styles.logoContainer}>
                  <Image 
                    source={mosqueLogoSource} 
                    style={{ width: 32, height: 32 }}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
          </BlurView>

          {/* Enhanced multi-layer edge effect */}
          <View style={styles.headerEdgeEffect}>
            <View
              style={[
                styles.headerEdgeGradient1,
                {
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(0,0,0,0.4)"
                      : "rgba(0,0,0,0.1)",
                },
              ]}
            />
            <View
              style={[
                styles.headerEdgeGradient2,
                {
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(0,0,0,0.2)"
                      : "rgba(0,0,0,0.05)",
                },
              ]}
            />
          </View>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.noDataContainer}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
          }
        >
          <View
            style={[styles.noDataCard, { backgroundColor: colors.surface }]}
          >
            <IconSymbol name="calendar" size={48} color={colors.text + "40"} />
            <Text style={[styles.noDataTitle, { color: colors.text }]}>
              {t.home.prayerTimesNotAvailable}
            </Text>
            <Text style={[styles.noDataText, { color: colors.text + "80" }]}>
              {t.home.prayerTimesNotUploaded}
            </Text>
            <TouchableOpacity
              style={[
                styles.refreshButton,
                { backgroundColor: colors.tint },
              ]}
              onPress={refreshData}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.refreshButtonText}>
                {isLoading ? t.common.checking : t.common.refresh}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Check if any prayer has notifications enabled (for partial state)
  const someBeginTimesEnabled = Object.values(preferences.prayers).some(
    (p) => p.beginTime
  );
  const someJamahTimesEnabled = Object.values(preferences.prayers).some(
    (p) => p.jamahTime
  );

  // Check if all prayers have notifications enabled
  const allBeginTimesEnabled = Object.values(preferences.prayers).every(
    (p) => p.beginTime
  );
  const allJamahTimesEnabled = Object.values(preferences.prayers).every(
    (p) => p.jamahTime
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      {/* Enhanced Header with Logo and Export */}
      <View style={styles.headerWrapper}>
        <BlurView
          intensity={85}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerMainRow}>
              <View style={styles.headerTextSection}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  Today
                </Text>
                <Text
                  style={[styles.headerSubtitle, { color: colors.text + "80" }]}
                >
                  {formatCurrentDate()}
                </Text>
                <Text
                  style={[styles.headerHijriDate, { color: colors.text + "60" }]}
                >
                  {formatCurrentHijriDate()}
                </Text>
              </View>

              <View style={styles.headerActions}>
                {/* Mosque Logo */}
                <View style={styles.logoContainer}>
                  <Image 
                    source={mosqueLogoSource} 
                    style={{ width: 48, height: 48 }}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>

            {/* Next Prayer Summary */}
            {nextPrayer && todaysPrayers && (
              <View
                style={[
                  styles.nextPrayerSummary,
                  { backgroundColor: colors.tint + "12" },
                ]}
              >
                <View style={styles.nextPrayerContent}>
                  <Text
                    style={[
                      styles.nextPrayerLabel,
                      { color: colors.tint + "85" },
                    ]}
                  >
                    {t.home.nextPrayer.toUpperCase()}
                  </Text>
                  <Text
                    style={[styles.nextPrayerName, { color: colors.tint }]}
                  >
                    {t.prayers[nextPrayer as keyof typeof t.prayers]}
                  </Text>
                </View>
                <Text
                  style={[styles.nextPrayerTime, { color: colors.tint }]}
                >
                  {getCountdownToNext() || t.prayers.soon}
                </Text>
              </View>
            )}
          </View>
        </BlurView>

        {/* Enhanced multi-layer edge effect */}
        <View style={styles.headerEdgeEffect}>
          <View
            style={[
              styles.headerEdgeGradient1,
              {
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(0,0,0,0.4)"
                    : "rgba(0,0,0,0.1)",
              },
            ]}
          />
          <View
            style={[
              styles.headerEdgeGradient2,
              {
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(0,0,0,0.2)"
                    : "rgba(0,0,0,0.05)",
              },
            ]}
          />
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Add subtle scroll edge effect at the top */}
        <View style={styles.scrollEdgeContainer}>
          <View
            style={[
              styles.scrollEdgeGradient,
              {
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(0,0,0,0.15)"
                    : "rgba(0,0,0,0.04)",
              },
            ]}
          />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.dailyView}>
              {/* Content Section Container */}
              <View
                style={[
                  styles.contentSection,
                  { backgroundColor: colors.background },
                ]}
              >
                {/* Prayer Cards */}
                <View style={styles.prayersList}>
                  {todaysPrayers ? (
                    <PrayerTimesDisplay
                      prayerTime={todaysPrayers}
                      currentPrayer={currentPrayer}
                      nextPrayer={nextPrayer}
                      pulseAnim={pulseAnim}
                      getCountdownToNext={getCountdownToNext}
                    />
                  ) : (
                    <View style={styles.noDataSection}>
                      <Text style={styles.noDataIcon}>📅</Text>
                      <Text
                        style={[
                          styles.noDataMessage,
                          { color: colors.text + "80" },
                        ]}
                      >
                        {t.home.noPrayerTimesForToday}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Visual Separator */}
              <View style={styles.sectionDivider}>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: colors.text + "10" },
                  ]}
                />
              </View>

              {/* Home Page Events Section */}
              <HomePageEvents />

              {/* Quick Actions - Enhanced with Notifications and Print */}
              <Animated.View
                style={[
                  styles.quickActionsContainer,
                  {
                    opacity: slideAnim,
                    transform: [
                      {
                        translateY: slideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {Platform.OS === 'ios' ? (
                  <BlurView
                    intensity={60}
                    tint={colorScheme === "dark" ? "dark" : "light"}
                    style={[
                      styles.quickActionsCard,
                      {
                        backgroundColor: colors.surface + "95",
                        borderColor:
                          colorScheme === "dark"
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.04)",
                      },
                    ]}
                  >
                  <View style={styles.quickActionsHeader}>
                    <ThemedText
                      style={[styles.quickActionsTitle, { color: colors.text }]}
                    >
                      {t.home.quickActions}
                    </ThemedText>
                  </View>

                  {/* Notification Toggles */}
                  <View style={styles.notificationToggles}>
                    <TouchableOpacity
                      style={[
                        styles.notificationToggleRow,
                        { borderBottomColor: colors.text + "10" },
                      ]}
                      activeOpacity={0.7}
                      onPress={handleToggleAllBeginTimes}
                    >
                      <View style={styles.toggleLeft}>
                        <View
                          style={[
                            styles.toggleIcon,
                            { backgroundColor: colors.tint + "15" },
                          ]}
                        >
                          <IconSymbol
                            name="bell"
                            size={20}
                            color={colors.tint}
                          />
                        </View>
                        <View style={styles.toggleInfo}>
                          <ThemedText
                            style={[styles.toggleTitle, { color: colors.text }]}
                          >
                            {t.notifications.allPrayerTimes}
                          </ThemedText>
                          <ThemedText
                            style={[
                              styles.toggleSubtitle,
                              { color: colors.text + "60" },
                            ]}
                          >
                            {t.notifications.notifyWhenEachPrayerBegins}
                          </ThemedText>
                        </View>
                      </View>
                      <Switch
                        value={allBeginTimesEnabled}
                        onValueChange={handleToggleAllBeginTimes}
                        trackColor={{
                          false: colors.text + "20",
                          true: colors.tint + "60",
                        }}
                        thumbColor={
                          allBeginTimesEnabled ? colors.tint : "#f4f3f4"
                        }
                        style={styles.toggleSwitch}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.notificationToggleRow}
                      activeOpacity={0.7}
                      onPress={handleToggleAllJamahTimes}
                    >
                      <View style={styles.toggleLeft}>
                        <View
                          style={[
                            styles.toggleIcon,
                            { backgroundColor: colors.secondary + "15" },
                          ]}
                        >
                          <FontAwesome6 name="people-group" size={20} color={colors.secondary} />
                        </View>
                        <View style={styles.toggleInfo}>
                          <ThemedText
                            style={[styles.toggleTitle, { color: colors.text }]}
                          >
                            {t.notifications.allJamahTimes}
                          </ThemedText>
                          <ThemedText
                            style={[
                              styles.toggleSubtitle,
                              { color: colors.text + "60" },
                            ]}
                          >
                            {t.notifications.notifyForCongregationPrayers}
                          </ThemedText>
                        </View>
                      </View>
                      <Switch
                        value={allJamahTimesEnabled}
                        onValueChange={handleToggleAllJamahTimes}
                        trackColor={{
                          false: colors.text + "20",
                          true: colors.tint + "60",
                        }}
                        thumbColor={
                          allJamahTimesEnabled ? colors.tint : "#f4f3f4"
                        }
                        style={styles.toggleSwitch}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Print Action */}
                  <TouchableOpacity
                    style={[
                      styles.printButton,
                      {
                        backgroundColor: colors.tint,
                        opacity: isExporting ? 0.7 : 1,
                      },
                    ]}
                    onPress={handlePrint}
                    disabled={isExporting}
                    activeOpacity={0.8}
                  >
                    {isExporting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <IconSymbol
                          name="square.and.arrow.down"
                          size={20}
                          color="#fff"
                        />
                        <ThemedText style={styles.printButtonText}>
                          {t.home.printMonth} {t.calendar?.months?.[getMonthName(currentMonth).toLowerCase() as keyof typeof t.calendar.months] || getMonthName(currentMonth)} {t.home.timetable}
                        </ThemedText>
                      </>
                    )}
                  </TouchableOpacity>
                  </BlurView>
                ) : (
                  <View
                    style={[
                      styles.quickActionsCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor:
                          colorScheme === "dark"
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.04)",
                      },
                    ]}
                  >
                    <View style={styles.quickActionsHeader}>
                      <ThemedText
                        style={[styles.quickActionsTitle, { color: colors.text }]}
                      >
                        {t.home.quickActions}
                      </ThemedText>
                    </View>

                    {/* Notification Toggles */}
                    <View style={styles.notificationToggles}>
                      <TouchableOpacity
                        style={[
                          styles.notificationToggleRow,
                          { borderBottomColor: colors.text + "10" },
                        ]}
                        activeOpacity={0.7}
                        onPress={handleToggleAllBeginTimes}
                      >
                        <View style={styles.toggleLeft}>
                          <View
                            style={[
                              styles.toggleIcon,
                              { backgroundColor: colors.tint + "15" },
                            ]}
                          >
                            <IconSymbol
                              name="bell"
                              size={20}
                              color={colors.tint}
                            />
                          </View>
                          <View style={styles.toggleInfo}>
                            <ThemedText
                              style={[styles.toggleTitle, { color: colors.text }]}
                            >
                              {t.notifications.allPrayerTimes}
                            </ThemedText>
                            <ThemedText
                              style={[
                                styles.toggleSubtitle,
                                { color: colors.text + "60" },
                              ]}
                            >
                              {t.notifications.notifyWhenEachPrayerBegins}
                            </ThemedText>
                          </View>
                        </View>
                        <Switch
                          value={allBeginTimesEnabled}
                          onValueChange={handleToggleAllBeginTimes}
                          trackColor={{
                            false: colors.text + "20",
                            true: colors.tint + "60",
                          }}
                          thumbColor={
                            allBeginTimesEnabled ? colors.tint : "#f4f3f4"
                          }
                          style={styles.toggleSwitch}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.notificationToggleRow}
                        activeOpacity={0.7}
                        onPress={handleToggleAllJamahTimes}
                      >
                        <View style={styles.toggleLeft}>
                          <View
                            style={[
                              styles.toggleIcon,
                              { backgroundColor: colors.secondary + "15" },
                            ]}
                          >
                            <FontAwesome6 name="people-group" size={20} color={colors.secondary} />
                          </View>
                          <View style={styles.toggleInfo}>
                            <ThemedText
                              style={[styles.toggleTitle, { color: colors.text }]}
                            >
                              {t.notifications.allJamahTimes}
                            </ThemedText>
                            <ThemedText
                              style={[
                                styles.toggleSubtitle,
                                { color: colors.text + "60" },
                              ]}
                            >
                              {t.notifications.notifyForCongregationPrayers}
                            </ThemedText>
                          </View>
                        </View>
                        <Switch
                          value={allJamahTimesEnabled}
                          onValueChange={handleToggleAllJamahTimes}
                          trackColor={{
                            false: colors.text + "20",
                            true: colors.tint + "60",
                          }}
                          thumbColor={
                            allJamahTimesEnabled ? colors.tint : "#f4f3f4"
                          }
                          style={styles.toggleSwitch}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Print Action */}
                    <TouchableOpacity
                      style={[
                        styles.printButton,
                        {
                          backgroundColor: colors.tint,
                          opacity: isExporting ? 0.7 : 1,
                        },
                      ]}
                      onPress={handlePrint}
                      disabled={isExporting}
                      activeOpacity={0.8}
                    >
                      {isExporting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <IconSymbol
                            name="square.and.arrow.down"
                            size={20}
                            color="#fff"
                          />
                          <ThemedText style={styles.printButtonText}>
                            {t.home.printMonth} {t.calendar?.months?.[getMonthName(currentMonth).toLowerCase() as keyof typeof t.calendar.months] || getMonthName(currentMonth)} {t.home.timetable}
                          </ThemedText>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>

              {/* Enhanced Mosque Info Card */}
              {Platform.OS === 'ios' ? (
                <BlurView
                  intensity={60}
                  tint={colorScheme === "dark" ? "dark" : "light"}
                  style={[
                    styles.mosqueInfoCard,
                    {
                      backgroundColor: colors.surface + "90",
                      borderColor:
                        colorScheme === "dark"
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                    },
                  ]}
                >
                  <View style={styles.mosqueLogoContainer}>
                    <Image 
                      source={mosqueLogoSource} 
                      style={{ width: 32, height: 32 }}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.mosqueInfoContent}>
                    <ThemedText
                      style={[styles.mosqueInfoTitle, { color: colors.text }]}
                    >
                      {t.mosqueInfo.name}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.mosqueInfoSubtitle,
                        { color: colors.text + "60" },
                      ]}
                    >
                      {t.mosqueInfo.location}
                    </ThemedText>
                  </View>
                </BlurView>
              ) : (
                <View
                  style={[
                    styles.mosqueInfoCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor:
                        colorScheme === "dark"
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                    },
                  ]}
                >
                  <View style={styles.mosqueLogoContainer}>
                    <Image 
                      source={mosqueLogoSource} 
                      style={{ width: 32, height: 32 }}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.mosqueInfoContent}>
                    <ThemedText
                      style={[styles.mosqueInfoTitle, { color: colors.text }]}
                    >
                      {t.mosqueInfo.name}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.mosqueInfoSubtitle,
                        { color: colors.text + "60" },
                      ]}
                    >
                      {t.mosqueInfo.location}
                    </ThemedText>
                  </View>
                </View>
              )}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// Enhanced styles with better visual hierarchy
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Enhanced header wrapper with stronger shadow
  headerWrapper: {
    backgroundColor: "transparent",
    zIndex: 10,
    // Enhanced iOS-specific shadow for better separation
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  // Enhanced header with logo support
  header: {
    paddingTop: Platform.OS === "ios" ? 50 : StatusBar.currentHeight || 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  // Multi-layer edge effect for better visual separation
  headerEdgeEffect: {
    flexDirection: "column",
  },

  headerEdgeGradient1: {
    height: 1,
    opacity: 0.15,
  },

  headerEdgeGradient2: {
    height: 1,
    opacity: 0.08,
  },

  // Scroll edge effect container
  scrollEdgeContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    zIndex: 1,
    pointerEvents: "none",
  },

  scrollEdgeGradient: {
    flex: 1,
    borderRadius: 8,
  },

  headerContent: {
    gap: 12,
  },

  headerMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTextSection: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: 0.37,
    marginBottom: 2,
  },

  headerSubtitle: {
    fontSize: 15,
    fontWeight: "400",
    letterSpacing: -0.4,
  },

  headerHijriDate: {
    fontSize: 13,
    fontWeight: "400",
    letterSpacing: -0.2,
    marginTop: 2,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  logoContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  nextPrayerSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.04)",
  },

  nextPrayerContent: {
    flex: 1,
  },

  nextPrayerLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },

  nextPrayerName: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },

  nextPrayerTime: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.4,
  },

  // Main content
  scrollContent: {
    flex: 1,
  },

  scrollContentContainer: {
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
    paddingTop: 8, // Add subtle top padding
  },

  dailyView: {
    flex: 1,
  },

  // Enhanced content section with more top padding
  contentSection: {
    paddingHorizontal: 16,
    paddingTop: 20, // Increased from 16 for better separation
    paddingBottom: 8,
    borderRadius: 12,
    marginHorizontal: 0,
    marginTop: 0,
  },

  // Section divider between content areas
  sectionDivider: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    alignItems: "center",
  },

  dividerLine: {
    height: 1,
    width: "100%",
    borderRadius: 0.5,
  },

  // Quick Actions with Notifications
  quickActionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  quickActionsCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    // Enhanced shadow for better depth perception
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  quickActionsHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },

  quickActionsTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },

  notificationToggles: {
    paddingHorizontal: 8,
  },

  notificationToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },

  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  toggleInfo: {
    flex: 1,
  },

  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.4,
    marginBottom: 2,
  },

  toggleSubtitle: {
    fontSize: 13,
    letterSpacing: -0.08,
  },

  toggleSwitch: {
    transform: Platform.OS === "ios" ? [{ scale: 0.85 }] : [],
  },

  printButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 12,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  printButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.4,
  },

  prayersList: {
    gap: 16,
  },

  // Enhanced mosque info card
  mosqueInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    // Consistent shadow styling
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  mosqueLogoContainer: {
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.02)",
  },

  mosqueInfoContent: {
    flex: 1,
  },

  mosqueInfoTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.4,
    marginBottom: 3,
  },

  mosqueInfoSubtitle: {
    fontSize: 14,
    letterSpacing: -0.08,
  },

  // Loading and no data states
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },

  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  noDataCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    maxWidth: 320,
  },

  noDataSection: {
    padding: 60,
    alignItems: "center",
  },

  noDataIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  noDataTitle: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: "center",
  },

  noDataText: {
    fontSize: 15,
    letterSpacing: -0.4,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },

  noDataMessage: {
    fontSize: 15,
    letterSpacing: -0.4,
    textAlign: "center",
  },

  refreshButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },

  refreshButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },

});

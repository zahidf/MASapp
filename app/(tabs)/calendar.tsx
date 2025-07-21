import { BlurView } from "expo-blur";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { DayDetail } from "@/components/prayer/DayDetail";
import { MonthlyCalendar } from "@/components/prayer/MonthlyCalendar";
import { HijriCalendar } from "@/components/prayer/HijriCalendar";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { PrayerTime } from "@/types/prayer";
import { useLanguage } from "@/contexts/LanguageContext";
import { getMonthName, getTodayString } from "@/utils/dateHelpers";
import { 
  gregorianToHijri, 
  formatHijriMonthYear, 
  getDaysInHijriMonth,
  getFirstDayOfHijriMonth,
  hijriToGregorian,
  getHijriMonthName
} from "@/utils/hijriDateUtils";
import { localizeYear, localizeDay, localizeNumbers } from "@/utils/numberLocalization";
import { generatePDFHTML } from "@/utils/pdfGenerator";
import { firebaseMosqueDetailsService } from "@/services/firebaseMosqueDetails";

const { width, height } = Dimensions.get("window");

type ExportType = "day" | "month" | "year";

export default function CalendarScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { prayerTimes, isLoading, refreshData } = usePrayerTimes();
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDayData, setSelectedDayData] = useState<PrayerTime | null>(
    null
  );
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<ExportType>("month");
  const [isExporting, setIsExporting] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [headerAnim] = useState(new Animated.Value(0));
  const [calendarType, setCalendarType] = useState<'gregorian' | 'hijri'>('gregorian');
  const [selectedHijriDate, setSelectedHijriDate] = useState(() => gregorianToHijri(new Date()));
  
  // Ensure translations are loaded before accessing any properties
  if (!t || !t.calendar || !t.calendar.months) {
    return null;
  }

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const today = getTodayString();

  React.useEffect(() => {
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

  const handleMonthChange = (direction: "prev" | "next") => {
    if (calendarType === 'gregorian') {
      const newDate = new Date(selectedDate);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      setSelectedDate(newDate);
      setSelectedHijriDate(gregorianToHijri(newDate));
    } else {
      // Hijri calendar navigation
      let newHijriMonth = selectedHijriDate.month;
      let newHijriYear = selectedHijriDate.year;
      
      if (direction === "prev") {
        newHijriMonth--;
        if (newHijriMonth < 1) {
          newHijriMonth = 12;
          newHijriYear--;
        }
      } else {
        newHijriMonth++;
        if (newHijriMonth > 12) {
          newHijriMonth = 1;
          newHijriYear++;
        }
      }
      
      const newGregorianDate = hijriToGregorian(newHijriYear, newHijriMonth, 1);
      setSelectedDate(newGregorianDate);
      setSelectedHijriDate({
        year: newHijriYear,
        month: newHijriMonth,
        day: 1,
        monthName: getHijriMonthName(newHijriMonth, 'en', t),
        monthNameAr: getHijriMonthName(newHijriMonth, 'ar', t)
      });
    }
  };

  const handleDaySelect = useCallback(
    (day: number, dateStr?: string, dayData?: PrayerTime) => {
      if (calendarType === 'gregorian') {
        const gregorianDateStr = `${currentYear}-${String(currentMonth + 1).padStart(
          2,
          "0"
        )}-${String(day).padStart(2, "0")}`;
        const prayerData = prayerTimes.find((pt) => pt.d_date === gregorianDateStr);

        if (prayerData) {
          setSelectedDayData(prayerData);
          setShowDayDetail(true);
        }
      } else {
        // Hijri calendar - use the provided dateStr and dayData
        if (dayData) {
          setSelectedDayData(dayData);
        } else if (dateStr) {
          // Show the day even without prayer data
          const gregorianDate = new Date(dateStr);
          const hijriDate = gregorianToHijri(gregorianDate);
          // Create a minimal prayer time object for display
          const minimalData: PrayerTime = {
            d_date: dateStr,
            fajr_begins: '',
            fajr_jamah: '',
            sunrise: '',
            zuhr_begins: '',
            zuhr_jamah: '',
            asr_mithl_1: '',
            asr_mithl_2: '',
            asr_jamah: '',
            maghrib_begins: '',
            maghrib_jamah: '',
            isha_begins: '',
            isha_jamah: '',
            is_ramadan: hijriDate.month === 9 ? 1 : 0
          };
          setSelectedDayData(minimalData);
        }
        setShowDayDetail(true);
      }
    },
    [currentMonth, currentYear, prayerTimes, calendarType]
  );

  const getMonthData = () => {
    const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-01`;
    const monthEnd = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-31`;

    return prayerTimes.filter(
      (pt) => pt.d_date >= monthStart && pt.d_date <= monthEnd
    );
  };

  const jumpToToday = () => {
    const today = new Date();
    setSelectedDate(today);
  };

  const isCurrentMonth = () => {
    const today = new Date();
    return (
      currentMonth === today.getMonth() && currentYear === today.getFullYear()
    );
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Fetch mosque details and Jumaah times
      const [mosqueDetails, jumaahTimes] = await Promise.all([
        firebaseMosqueDetailsService.getMosqueDetails(),
        firebaseMosqueDetailsService.getJumaahTimes()
      ]);

      let html = "";
      let filename = "";

      switch (exportType) {
        case "day":
          if (!selectedDayData) {
            Alert.alert(t.calendar.error, t.calendar.errorSelectDay);
            setIsExporting(false);
            return;
          }
          html = await generatePDFHTML([selectedDayData], "day", calendarType, mosqueDetails || undefined, jumaahTimes || undefined);
          const dayDate = new Date(selectedDayData.d_date);
          filename = `prayer-times-${dayDate.toISOString().split("T")[0]}.pdf`;
          break;

        case "month":
          const monthData = getMonthData();
          if (monthData.length === 0) {
            Alert.alert(t.calendar.error || 'Error', t.calendar.errorNoData || 'No data available for selected month');
            setIsExporting(false);
            return;
          }
          html = await generatePDFHTML(monthData, "month", calendarType, mosqueDetails || undefined, jumaahTimes || undefined);
          if (calendarType === 'hijri') {
            const monthName = getHijriMonthName(selectedHijriDate.month, 'en');
            filename = `prayer-times-${monthName}-${selectedHijriDate.year}-AH.pdf`;
          } else {
            filename = `prayer-times-${getMonthName(
              currentMonth
            )}-${currentYear}.pdf`;
          }
          break;

        case "year":
          const yearData = prayerTimes.filter((pt) =>
            pt.d_date.startsWith(currentYear.toString())
          );
          if (yearData.length === 0) {
            Alert.alert(t.calendar.error || 'Error', t.calendar.errorNoData || 'No data available for selected year');
            setIsExporting(false);
            return;
          }
          html = await generatePDFHTML(yearData, "year", calendarType, mosqueDetails || undefined, jumaahTimes || undefined);
          filename = `prayer-times-${currentYear}.pdf`;
          break;
      }

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
          dialogTitle: t.calendar.sharePrayerTimesPDF,
        });
      }

      setShowExportModal(false);
    } catch (error) {
      // Error generating PDF
      Alert.alert(t.calendar.error, t.calendar.exportError);
    } finally {
      setIsExporting(false);
    }
  };

  const monthData = getMonthData();
  const hasDataForMonth = monthData.length > 0;

  // Get today's prayer times for the info card
  const todaysPrayerTimes = prayerTimes.find((pt) => pt.d_date === today);

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
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t.calendar.title}
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: colors.text + "80" }]}
            >
              {t.calendar.subtitle}
            </Text>
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
          {/* Month Navigation Card */}
          <BlurView
            intensity={60}
            tint={colorScheme === "dark" ? "dark" : "light"}
            style={[
              styles.monthNavigationCard,
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
              onPress={() => handleMonthChange("prev")}
              style={styles.navButton}
              activeOpacity={0.7}
            >
              <IconSymbol
                name="chevron.left"
                size={24}
                color={colors.tint}
              />
            </TouchableOpacity>

            <View style={styles.monthDisplay}>
              <Text style={[styles.monthText, { color: colors.text }]}>
                {calendarType === 'gregorian' 
                  ? (t.calendar.months?.[getMonthName(currentMonth).toLowerCase() as keyof typeof t.calendar.months] || getMonthName(currentMonth))
                  : getHijriMonthName(selectedHijriDate.month, t.languageCode || 'en', t)}
              </Text>
              <Text style={[styles.yearText, { color: colors.text + "60" }]}>
                {calendarType === 'gregorian' 
                  ? localizeYear(currentYear, t.languageCode || 'en')
                  : `${localizeYear(selectedHijriDate.year, t.languageCode || 'en')} ${t.languageCode === 'ar' || t.languageCode === 'fa' || t.languageCode === 'ps' ? 'هـ' : 'AH'}`}
              </Text>
              <Text style={[styles.dateRangeText, { color: colors.text + "40" }]}>
                {calendarType === 'gregorian' ? (
                  // Show Hijri months that fall within this Gregorian month
                  (() => {
                    const firstDay = new Date(currentYear, currentMonth, 1);
                    const lastDay = new Date(currentYear, currentMonth + 1, 0);
                    const firstHijri = gregorianToHijri(firstDay);
                    const lastHijri = gregorianToHijri(lastDay);
                    
                    if (firstHijri.month === lastHijri.month && firstHijri.year === lastHijri.year) {
                      return formatHijriMonthYear(firstHijri, t.languageCode || 'en', t);
                    } else if (firstHijri.year === lastHijri.year) {
                      const firstMonth = getHijriMonthName(firstHijri.month, t.languageCode || 'en', t);
                      const lastMonth = getHijriMonthName(lastHijri.month, t.languageCode || 'en', t);
                      return `${firstMonth}-${lastMonth} ${localizeYear(firstHijri.year, t.languageCode || 'en')} ${t.languageCode === 'ar' || t.languageCode === 'fa' || t.languageCode === 'ps' ? 'هـ' : 'AH'}`;
                    } else {
                      const firstMonth = getHijriMonthName(firstHijri.month, t.languageCode || 'en', t);
                      const lastMonth = getHijriMonthName(lastHijri.month, t.languageCode || 'en', t);
                      return `${firstMonth} ${localizeYear(firstHijri.year, t.languageCode || 'en')} - ${lastMonth} ${localizeYear(lastHijri.year, t.languageCode || 'en')} ${t.languageCode === 'ar' || t.languageCode === 'fa' || t.languageCode === 'ps' ? 'هـ' : 'AH'}`;
                    }
                  })()
                ) : (
                  // Show Gregorian date range for this Hijri month
                  (() => {
                    const daysInMonth = getDaysInHijriMonth(selectedHijriDate.year, selectedHijriDate.month);
                    const firstDay = hijriToGregorian(selectedHijriDate.year, selectedHijriDate.month, 1);
                    const lastDay = hijriToGregorian(selectedHijriDate.year, selectedHijriDate.month, daysInMonth);
                    const firstMonth = firstDay.toLocaleDateString('en-US', { month: 'short' });
                    const lastMonth = lastDay.toLocaleDateString('en-US', { month: 'short' });
                    const firstYear = firstDay.getFullYear();
                    const lastYear = lastDay.getFullYear();
                    
                    if (firstMonth === lastMonth && firstYear === lastYear) {
                      return `${firstMonth} ${localizeDay(firstDay.getDate(), t.languageCode || 'en')}-${localizeDay(lastDay.getDate(), t.languageCode || 'en')}, ${localizeYear(firstYear, t.languageCode || 'en')}`;
                    } else if (firstYear === lastYear) {
                      return `${firstMonth} ${localizeDay(firstDay.getDate(), t.languageCode || 'en')} - ${lastMonth} ${localizeDay(lastDay.getDate(), t.languageCode || 'en')}, ${localizeYear(firstYear, t.languageCode || 'en')}`;
                    } else {
                      return `${firstMonth} ${localizeDay(firstDay.getDate(), t.languageCode || 'en')}, ${localizeYear(firstYear, t.languageCode || 'en')} - ${lastMonth} ${localizeDay(lastDay.getDate(), t.languageCode || 'en')}, ${localizeYear(lastYear, t.languageCode || 'en')}`;
                    }
                  })()
                )}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handleMonthChange("next")}
              style={styles.navButton}
              activeOpacity={0.7}
            >
              <IconSymbol
                name="chevron.right"
                size={24}
                color={colors.tint}
              />
            </TouchableOpacity>
          </BlurView>

          {/* Calendar Type Toggle */}
          <View style={styles.calendarTypeToggle}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                calendarType === 'gregorian' && styles.toggleButtonActive,
                { borderColor: calendarType === 'gregorian' ? colors.tint : colors.text + "20" }
              ]}
              onPress={() => setCalendarType('gregorian')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.toggleButtonText,
                { color: calendarType === 'gregorian' ? colors.tint : colors.text + "60" }
              ]}>
                {t.calendar.gregorian}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                calendarType === 'hijri' && styles.toggleButtonActive,
                { borderColor: calendarType === 'hijri' ? colors.tint : colors.text + "20" }
              ]}
              onPress={() => setCalendarType('hijri')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.toggleButtonText,
                { color: calendarType === 'hijri' ? colors.tint : colors.text + "60" }
              ]}>
                {t.calendar.hijri}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Today's Info Card (if on current month) */}
          {isCurrentMonth() && todaysPrayerTimes && (
            <BlurView
              intensity={60}
              tint={colorScheme === "dark" ? "dark" : "light"}
              style={[
                styles.todayInfoCard,
                {
                  backgroundColor: colors.tint + "15",
                  borderColor: colors.tint + "30",
                },
              ]}
            >
              <View style={styles.todayInfoHeader}>
                <View
                  style={[
                    styles.todayIconContainer,
                    { backgroundColor: colors.tint + "20" },
                  ]}
                >
                  <IconSymbol
                    name="calendar"
                    size={20}
                    color={colors.tint}
                  />
                </View>
                <Text
                  style={[styles.todayInfoTitle, { color: colors.tint }]}
                >
                  {t.calendar.todaysPrayerTimes}
                </Text>
              </View>
              <Text
                style={[styles.todayInfoText, { color: colors.text + "80" }]}
              >
                {t.calendar.todaysPrayerTimesDesc}
              </Text>
            </BlurView>
          )}

          {/* Calendar Content */}
          <View style={styles.calendarContainer}>
            {calendarType === 'gregorian' ? (
              hasDataForMonth ? (
                <MonthlyCalendar
                  month={currentMonth}
                  year={currentYear}
                  monthData={monthData}
                  onDaySelect={handleDaySelect}
                />
              ) : (
              <BlurView
                intensity={60}
                tint={colorScheme === "dark" ? "dark" : "light"}
                style={[
                  styles.noDataCard,
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
                    styles.noDataIconContainer,
                    { backgroundColor: colors.tint + "15" },
                  ]}
                >
                  <IconSymbol
                    name="calendar"
                    size={48}
                    color={colors.tint}
                  />
                </View>
                <Text style={[styles.noDataTitle, { color: colors.text }]}>
                  {t.calendar.noPrayerTimesAvailable}
                </Text>
                <Text
                  style={[styles.noDataText, { color: colors.text + "60" }]}
                >
                  {t.calendar.noPrayerTimesMessage
                    .replace('{month}', t.calendar.months?.[getMonthName(currentMonth).toLowerCase() as keyof typeof t.calendar.months] || getMonthName(currentMonth))
                    .replace('{year}', currentYear.toString())}
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
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <IconSymbol
                        name="arrow.clockwise"
                        size={16}
                        color="#fff"
                      />
                      <Text style={styles.refreshButtonText}>{t.calendar.refreshData}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </BlurView>
              )
            ) : (
              // Hijri Calendar
              <HijriCalendar
                month={selectedHijriDate.month}
                year={selectedHijriDate.year}
                monthData={prayerTimes} // Pass all prayer times, the component will filter
                onDaySelect={handleDaySelect}
              />
            )}
          </View>

          {/* Quick Actions - Show always for both calendar types */}
          {(hasDataForMonth || calendarType === 'hijri') && (
            <View style={styles.quickActionsContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t.calendar.quickActions}
              </Text>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: colors.surface,
                      borderColor:
                        colorScheme === "dark"
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.06)",
                    },
                  ]}
                  onPress={() => {
                    setExportType("month");
                    setShowExportModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.actionIconContainer,
                      { backgroundColor: colors.tint + "15" },
                    ]}
                  >
                    <IconSymbol
                      name="square.and.arrow.down"
                      size={20}
                      color={colors.tint}
                    />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text
                      style={[styles.actionButtonTitle, { color: colors.text }]}
                    >
                      {t.calendar.exportPDF}
                    </Text>
                    <Text
                      style={[
                        styles.actionButtonSubtitle,
                        { color: colors.text + "60" },
                      ]}
                    >
                      {t.calendar.downloadThisMonth}
                    </Text>
                  </View>
                  <IconSymbol
                    name="chevron.right"
                    size={16}
                    color={colors.text + "40"}
                  />
                </TouchableOpacity>

                {!isCurrentMonth() && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: colors.surface,
                        borderColor:
                          colorScheme === "dark"
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.06)",
                      },
                    ]}
                    onPress={jumpToToday}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.actionIconContainer,
                        { backgroundColor: colors.secondary + "15" },
                      ]}
                    >
                      <IconSymbol
                        name="house"
                        size={20}
                        color={colors.secondary}
                      />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text
                        style={[
                          styles.actionButtonTitle,
                          { color: colors.text },
                        ]}
                      >
                        {t.calendar.today}
                      </Text>
                      <Text
                        style={[
                          styles.actionButtonSubtitle,
                          { color: colors.text + "60" },
                        ]}
                      >
                        {t.calendar.returnToCurrentMonth}
                      </Text>
                    </View>
                    <IconSymbol
                      name="chevron.right"
                      size={16}
                      color={colors.text + "40"}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

        </Animated.View>
      </ScrollView>

      {/* Day Detail Modal */}
      <Modal
        visible={showDayDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDayDetail(false)}
      >
        {selectedDayData && (
          <DayDetail
            prayerTime={selectedDayData}
            onClose={() => setShowDayDetail(false)}
          />
        )}
      </Modal>

      {/* Export Options Modal */}
      <Modal
        visible={showExportModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={80}
            tint={colorScheme === "dark" ? "dark" : "light"}
            style={[
              styles.exportModal,
              { backgroundColor: colors.background + "F5" },
            ]}
          >
            <View style={styles.exportModalHeader}>
              <Text style={[styles.exportModalTitle, { color: colors.text }]}>
                {t.calendar.exportPrayerTimes}
              </Text>
              <TouchableOpacity
                onPress={() => setShowExportModal(false)}
                style={styles.modalCloseButton}
              >
                <IconSymbol name="xmark" size={20} color={colors.text + "80"} />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.exportModalSubtitle,
                { color: colors.text + "80" },
              ]}
            >
              {t.calendar.selectExportType}
            </Text>

            <View style={styles.exportOptions}>
              {selectedDayData && (
                <TouchableOpacity
                  style={[
                    styles.exportOption,
                    {
                      backgroundColor:
                        exportType === "day"
                          ? colors.tint + "15"
                          : "transparent",
                      borderColor:
                        exportType === "day"
                          ? colors.tint
                          : colors.text + "20",
                    },
                  ]}
                  onPress={() => setExportType("day")}
                  activeOpacity={0.7}
                >
                  <View style={styles.exportOptionIcon}>
                    <IconSymbol
                      name="calendar"
                      size={24}
                      color={
                        exportType === "day"
                          ? colors.tint
                          : colors.text + "60"
                      }
                    />
                  </View>
                  <View style={styles.exportOptionContent}>
                    <Text
                      style={[styles.exportOptionText, { color: colors.text }]}
                    >
                      {t.calendar.exportTypes.day}
                    </Text>
                    <Text
                      style={[
                        styles.exportOptionSubtext,
                        { color: colors.text + "60" },
                      ]}
                    >
                      {new Date(selectedDayData.d_date).toLocaleDateString()}
                    </Text>
                  </View>
                  {exportType === "day" && (
                    <IconSymbol
                      name="checkmark"
                      size={20}
                      color={colors.tint}
                    />
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.exportOption,
                  {
                    backgroundColor:
                      exportType === "month"
                        ? colors.tint + "15"
                        : "transparent",
                    borderColor:
                      exportType === "month"
                        ? colors.tint
                        : colors.text + "20",
                  },
                ]}
                onPress={() => setExportType("month")}
                activeOpacity={0.7}
              >
                <View style={styles.exportOptionIcon}>
                  <IconSymbol
                    name="calendar"
                    size={24}
                    color={
                      exportType === "month"
                        ? colors.tint
                        : colors.text + "60"
                    }
                  />
                </View>
                <View style={styles.exportOptionContent}>
                  <Text
                    style={[styles.exportOptionText, { color: colors.text }]}
                  >
                    {t.calendar.exportTypes.month}
                  </Text>
                  <Text
                    style={[
                      styles.exportOptionSubtext,
                      { color: colors.text + "60" },
                    ]}
                  >
                    {t.calendar.months?.[getMonthName(currentMonth).toLowerCase() as keyof typeof t.calendar.months] || getMonthName(currentMonth)} {currentYear}
                  </Text>
                </View>
                {exportType === "month" && (
                  <IconSymbol
                    name="checkmark"
                    size={20}
                    color={colors.tint}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.exportOption,
                  {
                    backgroundColor:
                      exportType === "year"
                        ? colors.tint + "15"
                        : "transparent",
                    borderColor:
                      exportType === "year"
                        ? colors.tint
                        : colors.text + "20",
                  },
                ]}
                onPress={() => setExportType("year")}
                activeOpacity={0.7}
              >
                <View style={styles.exportOptionIcon}>
                  <IconSymbol
                    name="calendar"
                    size={24}
                    color={
                      exportType === "year"
                        ? colors.tint
                        : colors.text + "60"
                    }
                  />
                </View>
                <View style={styles.exportOptionContent}>
                  <Text
                    style={[styles.exportOptionText, { color: colors.text }]}
                  >
                    {t.calendar.exportTypes.year}
                  </Text>
                  <Text
                    style={[
                      styles.exportOptionSubtext,
                      { color: colors.text + "60" },
                    ]}
                  >
                    {currentYear}
                  </Text>
                </View>
                {exportType === "year" && (
                  <IconSymbol
                    name="checkmark"
                    size={20}
                    color={colors.tint}
                  />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.exportConfirmButton,
                { backgroundColor: colors.tint },
                isExporting && styles.exportingButton,
              ]}
              onPress={handleExport}
              disabled={isExporting}
              activeOpacity={0.8}
            >
              {isExporting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <IconSymbol
                    name="square.and.arrow.down"
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.exportConfirmText}>{t.calendar.generatePDF}</Text>
                </>
              )}
            </TouchableOpacity>
          </BlurView>
        </View>
      </Modal>
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

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
  },

  // Month Navigation Card
  monthNavigationCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },

  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
  },

  monthDisplay: {
    alignItems: "center",
    flex: 1,
  },

  monthText: {
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: -0.4,
    marginBottom: 2,
  },

  yearText: {
    fontSize: 15,
    fontWeight: "400",
    letterSpacing: -0.2,
  },

  dateRangeText: {
    fontSize: 12,
    fontWeight: "400",
    letterSpacing: -0.1,
    marginTop: 4,
  },

  // Calendar Type Toggle
  calendarTypeToggle: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },

  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    backgroundColor: "transparent",
  },

  toggleButtonActive: {
    backgroundColor: "rgba(0,0,0,0.02)",
  },

  toggleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  // Today's Info Card
  todayInfoCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },

  todayInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },

  todayIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  todayInfoTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.4,
  },

  todayInfoText: {
    fontSize: 14,
    letterSpacing: -0.2,
    lineHeight: 20,
  },

  // Calendar Container
  calendarContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },

  // No Data Card
  noDataCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },

  noDataIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
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
    letterSpacing: -0.2,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 24,
  },

  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
  },

  refreshButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },

  // Quick Actions
  quickActionsContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.4,
    marginBottom: 12,
  },

  actionButtons: {
    gap: 12,
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },

  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  actionTextContainer: {
    flex: 1,
  },

  actionButtonTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
    marginBottom: 2,
  },

  actionButtonSubtitle: {
    fontSize: 13,
    letterSpacing: -0.08,
  },


  // Export Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  exportModal: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    padding: 0,
    overflow: "hidden",
  },

  exportModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },

  exportModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },

  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },

  exportModalSubtitle: {
    fontSize: 15,
    letterSpacing: -0.2,
    paddingHorizontal: 24,
    marginBottom: 20,
  },

  exportOptions: {
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 20,
  },

  exportOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },

  exportOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    justifyContent: "center",
    alignItems: "center",
  },

  exportOptionContent: {
    flex: 1,
  },

  exportOptionText: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
    marginBottom: 2,
  },

  exportOptionSubtext: {
    fontSize: 13,
    letterSpacing: -0.08,
  },

  exportConfirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    margin: 24,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },

  exportingButton: {
    opacity: 0.7,
  },

  exportConfirmText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
});

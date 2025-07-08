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
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { PrayerTime } from "@/types/prayer";
import { getMonthName, getTodayString } from "@/utils/dateHelpers";
import { generatePDFHTML } from "@/utils/pdfGenerator";

const { width, height } = Dimensions.get("window");

type ExportType = "day" | "month" | "year";

export default function CalendarScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { prayerTimes, isLoading, refreshData } = usePrayerTimes();
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
    const newDate = new Date(selectedDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const handleDaySelect = useCallback(
    (day: number) => {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;
      const dayData = prayerTimes.find((pt) => pt.d_date === dateStr);

      if (dayData) {
        setSelectedDayData(dayData);
        setShowDayDetail(true);
      }
    },
    [currentMonth, currentYear, prayerTimes]
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
      let html = "";
      let filename = "";

      switch (exportType) {
        case "day":
          if (!selectedDayData) {
            Alert.alert("Error", "Please select a day to export");
            setIsExporting(false);
            return;
          }
          html = await generatePDFHTML([selectedDayData], "day");
          const dayDate = new Date(selectedDayData.d_date);
          filename = `prayer-times-${dayDate.toISOString().split("T")[0]}.pdf`;
          break;

        case "month":
          const monthData = getMonthData();
          if (monthData.length === 0) {
            Alert.alert("Error", "No data available for selected month");
            setIsExporting(false);
            return;
          }
          html = await generatePDFHTML(monthData, "month");
          filename = `prayer-times-${getMonthName(
            currentMonth
          )}-${currentYear}.pdf`;
          break;

        case "year":
          const yearData = prayerTimes.filter((pt) =>
            pt.d_date.startsWith(currentYear.toString())
          );
          if (yearData.length === 0) {
            Alert.alert("Error", "No data available for selected year");
            setIsExporting(false);
            return;
          }
          html = await generatePDFHTML(yearData, "year");
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
          dialogTitle: "Share Prayer Times PDF",
        });
      }

      setShowExportModal(false);
    } catch (error) {
      // Error generating PDF
      Alert.alert("Error", "Failed to generate PDF. Please try again.");
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
              Prayer Calendar
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: colors.text + "80" }]}
            >
              View and export monthly prayer times
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
                {getMonthName(currentMonth)}
              </Text>
              <Text style={[styles.yearText, { color: colors.text + "60" }]}>
                {currentYear}
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
                  Today's Prayer Times
                </Text>
              </View>
              <Text
                style={[styles.todayInfoText, { color: colors.text + "80" }]}
              >
                Tap on today's date below to view detailed prayer times
              </Text>
            </BlurView>
          )}

          {/* Calendar Content */}
          <View style={styles.calendarContainer}>
            {hasDataForMonth ? (
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
                  No Prayer Times Available
                </Text>
                <Text
                  style={[styles.noDataText, { color: colors.text + "60" }]}
                >
                  Prayer times for {getMonthName(currentMonth)} {currentYear}{" "}
                  haven't been uploaded yet.
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
                      <Text style={styles.refreshButtonText}>Refresh Data</Text>
                    </>
                  )}
                </TouchableOpacity>
              </BlurView>
            )}
          </View>

          {/* Quick Actions */}
          {hasDataForMonth && (
            <View style={styles.quickActionsContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Quick Actions
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
                      Export PDF
                    </Text>
                    <Text
                      style={[
                        styles.actionButtonSubtitle,
                        { color: colors.text + "60" },
                      ]}
                    >
                      Download this month
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
                        Today
                      </Text>
                      <Text
                        style={[
                          styles.actionButtonSubtitle,
                          { color: colors.text + "60" },
                        ]}
                      >
                        Return to current month
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

          {/* Calendar Legend */}
          <View style={styles.legendContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Legend
            </Text>
            <View style={styles.legendItems}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: colors.tint },
                  ]}
                />
                <Text
                  style={[styles.legendText, { color: colors.text + "80" }]}
                >
                  Today
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    {
                      backgroundColor:
                        colorScheme === "dark" ? "#B8860B" : "#F9A825",
                    },
                  ]}
                >
                  <Text style={styles.legendIcon}>🌙</Text>
                </View>
                <Text
                  style={[styles.legendText, { color: colors.text + "80" }]}
                >
                  Ramadan
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    {
                      backgroundColor: colors.tint + "20",
                      borderWidth: 1,
                      borderColor: colors.tint,
                    },
                  ]}
                />
                <Text
                  style={[styles.legendText, { color: colors.text + "80" }]}
                >
                  Has Prayer Times
                </Text>
              </View>
            </View>
          </View>
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
                Export Prayer Times
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
              Choose what to export as PDF
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
                      Selected Day
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
                    Current Month
                  </Text>
                  <Text
                    style={[
                      styles.exportOptionSubtext,
                      { color: colors.text + "60" },
                    ]}
                  >
                    {getMonthName(currentMonth)} {currentYear}
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
                    Full Year
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
                  <Text style={styles.exportConfirmText}>Generate PDF</Text>
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

  // Legend
  legendContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },

  legendItems: {
    flexDirection: "row",
    gap: 24,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  legendDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  legendIcon: {
    fontSize: 12,
  },

  legendText: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.2,
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

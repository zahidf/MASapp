import { LinearGradient } from "expo-linear-gradient";
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
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DayDetail } from "@/components/prayer/DayDetail";
import { MonthlyCalendar } from "@/components/prayer/MonthlyCalendar";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { PrayerTime } from "@/types/prayer";
import { getMonthName, getTodayString } from "@/utils/dateHelpers";
import { generatePDFHTML } from "@/utils/pdfGenerator";

const { width } = Dimensions.get("window");

type ExportType = "day" | "month" | "year";

export default function CalendarScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { prayerTimes } = usePrayerTimes();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDayData, setSelectedDayData] = useState<PrayerTime | null>(
    null
  );
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<ExportType>("month");
  const [isExporting, setIsExporting] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const today = getTodayString();

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
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
      console.error("Error generating PDF:", error);
      Alert.alert("Error", "Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const monthData = getMonthData();
  const hasDataForMonth = monthData.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Enhanced Header - Matching Homepage */}
          <LinearGradient
            colors={
              colorScheme === "dark"
                ? ["#1B5E20", "#2E7D32", "#388E3C"]
                : ["#E8F5E9", "#C8E6C9", "#A5D6A7"]
            }
            style={styles.gradientHeader}
          >
            <View style={styles.logoContainer}>
              <IconSymbol name="calendar" size={48} color="#fff" />
            </View>

            <View style={styles.headerContent}>
              <ThemedText style={styles.greetingText}>Prayer Times</ThemedText>
              <ThemedText style={styles.mosqueNameEnhanced}>
                Prayer Calendar
              </ThemedText>
              <ThemedText style={styles.dateTextEnhanced}>
                {getMonthName(currentMonth)} {currentYear}
              </ThemedText>
            </View>

            <View style={styles.headerActionsColumn}>
              {!isCurrentMonth() && (
                <TouchableOpacity
                  style={styles.todayButtonHeader}
                  onPress={jumpToToday}
                >
                  <IconSymbol name="house" size={16} color="#fff" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.exportButtonHeader}
                onPress={() => setShowExportModal(true)}
              >
                <IconSymbol
                  name="square.and.arrow.down"
                  size={20}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Month Navigation */}
          <ThemedView
            style={[
              styles.monthNavigation,
              { backgroundColor: colors.surface },
            ]}
          >
            <TouchableOpacity
              onPress={() => handleMonthChange("prev")}
              style={[
                styles.navButton,
                {
                  backgroundColor: `${colors.primary}15`,
                  borderColor: colors.primary,
                },
              ]}
            >
              <IconSymbol
                name="chevron.left"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>

            <View style={styles.monthDisplay}>
              <ThemedText style={[styles.monthText, { color: colors.text }]}>
                {getMonthName(currentMonth)}
              </ThemedText>
              <ThemedText
                style={[styles.yearText, { color: `${colors.text}80` }]}
              >
                {currentYear}
              </ThemedText>
            </View>

            <TouchableOpacity
              onPress={() => handleMonthChange("next")}
              style={[
                styles.navButton,
                {
                  backgroundColor: `${colors.primary}15`,
                  borderColor: colors.primary,
                },
              ]}
            >
              <IconSymbol
                name="chevron.right"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          </ThemedView>

          {/* Calendar Content */}
          <View style={styles.calendarContent}>
            {hasDataForMonth ? (
              <MonthlyCalendar
                month={currentMonth}
                year={currentYear}
                monthData={monthData}
                onDaySelect={handleDaySelect}
              />
            ) : (
              <ThemedView
                style={[
                  styles.noDataContainer,
                  { backgroundColor: colors.surface },
                ]}
              >
                <View style={styles.noDataIconContainer}>
                  <IconSymbol
                    name="calendar"
                    size={64}
                    color={colors.primary}
                  />
                </View>
                <ThemedText
                  style={[styles.noDataTitle, { color: colors.text }]}
                >
                  No Prayer Times Available
                </ThemedText>
                <ThemedText
                  style={[styles.noDataText, { color: `${colors.text}80` }]}
                >
                  Prayer times for {getMonthName(currentMonth)} {currentYear}{" "}
                  haven't been uploaded yet.
                </ThemedText>
              </ThemedView>
            )}
          </View>

          {/* Quick Actions */}
          {hasDataForMonth && (
            <ThemedView
              style={[styles.quickActions, { backgroundColor: colors.surface }]}
            >
              <ThemedText
                style={[styles.quickActionsTitle, { color: colors.primary }]}
              >
                Quick Actions
              </ThemedText>

              <View style={styles.actionsGrid}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: `${colors.primary}15` },
                  ]}
                  onPress={() => {
                    setExportType("month");
                    setShowExportModal(true);
                  }}
                >
                  <IconSymbol
                    name="square.and.arrow.down"
                    size={24}
                    color={colors.primary}
                  />
                  <ThemedText
                    style={[styles.actionButtonText, { color: colors.primary }]}
                  >
                    Export Month
                  </ThemedText>
                </TouchableOpacity>

                {!isCurrentMonth() && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: `${colors.secondary}15` },
                    ]}
                    onPress={jumpToToday}
                  >
                    <IconSymbol
                      name="house"
                      size={24}
                      color={colors.secondary}
                    />
                    <ThemedText
                      style={[
                        styles.actionButtonText,
                        { color: colors.secondary },
                      ]}
                    >
                      Go to Today
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </ThemedView>
          )}

          {/* Legend */}
          <ThemedView
            style={[styles.legend, { backgroundColor: colors.surface }]}
          >
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: colors.primary },
                ]}
              />
              <ThemedText
                style={[styles.legendText, { color: `${colors.text}B3` }]}
              >
                Today
              </ThemedText>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  {
                    backgroundColor:
                      colorScheme === "dark" ? "#3E2723" : "#FFF3E0",
                  },
                ]}
              >
                <ThemedText style={styles.legendRamadanIcon}>🌙</ThemedText>
              </View>
              <ThemedText
                style={[styles.legendText, { color: `${colors.text}B3` }]}
              >
                Ramadan
              </ThemedText>
            </View>
          </ThemedView>
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
          <ThemedView
            style={[styles.exportModal, { backgroundColor: colors.background }]}
          >
            <View style={styles.exportModalHeader}>
              <ThemedText
                type="subtitle"
                style={[styles.exportModalTitle, { color: colors.text }]}
              >
                Export Prayer Times
              </ThemedText>
              <TouchableOpacity
                onPress={() => setShowExportModal(false)}
                style={styles.closeButton}
              >
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ThemedText
              style={[
                styles.exportModalSubtitle,
                { color: `${colors.text}B3` },
              ]}
            >
              Choose what to export as PDF
            </ThemedText>

            <View style={styles.exportOptions}>
              <TouchableOpacity
                style={[
                  styles.exportOption,
                  {
                    backgroundColor:
                      exportType === "day" ? colors.primary : colors.surface,
                    borderColor:
                      exportType === "day" ? colors.primary : "transparent",
                  },
                ]}
                onPress={() => setExportType("day")}
              >
                <IconSymbol
                  name="calendar"
                  size={24}
                  color={exportType === "day" ? "#fff" : colors.text}
                />
                <View style={styles.exportOptionContent}>
                  <ThemedText
                    style={[
                      styles.exportOptionText,
                      { color: exportType === "day" ? "#fff" : colors.text },
                    ]}
                  >
                    Selected Day
                  </ThemedText>
                  {selectedDayData && (
                    <ThemedText
                      style={[
                        styles.exportOptionSubtext,
                        {
                          color:
                            exportType === "day"
                              ? "#ffffffB3"
                              : `${colors.text}80`,
                        },
                      ]}
                    >
                      {new Date(selectedDayData.d_date).toLocaleDateString()}
                    </ThemedText>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.exportOption,
                  {
                    backgroundColor:
                      exportType === "month" ? colors.primary : colors.surface,
                    borderColor:
                      exportType === "month" ? colors.primary : "transparent",
                  },
                ]}
                onPress={() => setExportType("month")}
              >
                <IconSymbol
                  name="calendar"
                  size={24}
                  color={exportType === "month" ? "#fff" : colors.text}
                />
                <View style={styles.exportOptionContent}>
                  <ThemedText
                    style={[
                      styles.exportOptionText,
                      { color: exportType === "month" ? "#fff" : colors.text },
                    ]}
                  >
                    Current Month
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.exportOptionSubtext,
                      {
                        color:
                          exportType === "month"
                            ? "#ffffffB3"
                            : `${colors.text}80`,
                      },
                    ]}
                  >
                    {getMonthName(currentMonth)} {currentYear}
                  </ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.exportOption,
                  {
                    backgroundColor:
                      exportType === "year" ? colors.primary : colors.surface,
                    borderColor:
                      exportType === "year" ? colors.primary : "transparent",
                  },
                ]}
                onPress={() => setExportType("year")}
              >
                <IconSymbol
                  name="calendar"
                  size={24}
                  color={exportType === "year" ? "#fff" : colors.text}
                />
                <View style={styles.exportOptionContent}>
                  <ThemedText
                    style={[
                      styles.exportOptionText,
                      { color: exportType === "year" ? "#fff" : colors.text },
                    ]}
                  >
                    Full Year
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.exportOptionSubtext,
                      {
                        color:
                          exportType === "year"
                            ? "#ffffffB3"
                            : `${colors.text}80`,
                      },
                    ]}
                  >
                    {currentYear}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.exportConfirmButton,
                { backgroundColor: colors.primary },
                isExporting && styles.exportingButton,
              ]}
              onPress={handleExport}
              disabled={isExporting}
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
                  <ThemedText style={styles.exportConfirmText}>
                    Generate PDF
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
  },
  gradientHeader: {
    paddingTop: Platform.OS === "ios" ? 44 : StatusBar.currentHeight || 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    minHeight: Platform.OS === "ios" ? 100 : 80,
  },
  logoContainer: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    justifyContent: "center",
  },
  greetingText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    marginBottom: 2,
  },
  mosqueNameEnhanced: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  dateTextEnhanced: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  headerActionsColumn: {
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  todayButtonHeader: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
  },
  exportButtonHeader: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
  },
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  monthDisplay: {
    alignItems: "center",
    flex: 1,
  },
  monthText: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  yearText: {
    fontSize: 16,
    fontWeight: "600",
  },
  calendarContent: {
    flex: 1,
    marginHorizontal: 20,
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  noDataIconContainer: {
    padding: 24,
    backgroundColor: "rgba(27, 94, 32, 0.1)",
    borderRadius: 32,
    marginBottom: 24,
  },
  noDataTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  noDataText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  quickActions: {
    margin: 20,
    padding: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  actionsGrid: {
    flexDirection: "row",
    gap: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 32,
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  legendColor: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  legendRamadanIcon: {
    fontSize: 14,
  },
  legendText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  exportModal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 24,
  },
  exportModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  exportModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: 8,
  },
  exportModalSubtitle: {
    fontSize: 16,
    marginBottom: 32,
    lineHeight: 24,
  },
  exportOptions: {
    gap: 16,
    marginBottom: 32,
  },
  exportOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
  },
  exportOptionContent: {
    flex: 1,
  },
  exportOptionText: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  exportOptionSubtext: {
    fontSize: 14,
    fontWeight: "500",
  },
  exportConfirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  exportingButton: {
    opacity: 0.7,
  },
  exportConfirmText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

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
          html = await generatePDFHTML([selectedDayData], "day"); // Add await here
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
          html = await generatePDFHTML(monthData, "month"); // Add await here
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
          html = await generatePDFHTML(yearData, "year"); // Add await here
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

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Enhanced Header */}
          <ThemedView style={styles.header}>
            <View style={styles.headerTop}>
              <ThemedText type="title" style={styles.title}>
                Prayer Calendar
              </ThemedText>
              <TouchableOpacity
                style={[
                  styles.exportButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => setShowExportModal(true)}
              >
                <IconSymbol
                  name="square.and.arrow.down"
                  size={20}
                  color="#fff"
                />
                <ThemedText style={styles.exportButtonText}>Export</ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText
              style={[styles.subtitle, { color: `${colors.text}B3` }]}
            >
              Tap any day to view detailed prayer times
            </ThemedText>
          </ThemedView>

          {/* Month/Year Selector */}
          <ThemedView
            style={[styles.monthSelector, { backgroundColor: colors.surface }]}
          >
            <TouchableOpacity
              onPress={() => handleMonthChange("prev")}
              style={styles.monthButton}
            >
              <IconSymbol name="chevron.left" size={24} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.monthYearDisplay}>
              <ThemedText style={styles.monthText}>
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
              style={styles.monthButton}
            >
              <IconSymbol name="chevron.right" size={24} color={colors.text} />
            </TouchableOpacity>
          </ThemedView>

          {/* Today Button */}
          {today.startsWith(
            `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`
          ) && (
            <TouchableOpacity
              style={[
                styles.todayButton,
                { backgroundColor: colors.secondary },
              ]}
              onPress={() => {
                const todayDay = parseInt(today.split("-")[2]);
                handleDaySelect(todayDay);
              }}
            >
              <IconSymbol name="calendar" size={16} color="#fff" />
              <ThemedText style={styles.todayButtonText}>
                Jump to Today
              </ThemedText>
            </TouchableOpacity>
          )}

          {/* Calendar Grid */}
          {hasDataForMonth ? (
            <MonthlyCalendar
              month={currentMonth}
              year={currentYear}
              monthData={monthData}
              onDaySelect={handleDaySelect}
            />
          ) : (
            <ThemedView style={styles.noDataContainer}>
              <IconSymbol
                name="calendar"
                size={48}
                color={`${colors.text}40`}
              />
              <ThemedText
                style={[styles.noDataText, { color: `${colors.text}80` }]}
              >
                No prayer times available for {getMonthName(currentMonth)}{" "}
                {currentYear}
              </ThemedText>
            </ThemedView>
          )}

          {/* Quick Stats */}
          {hasDataForMonth && (
            <ThemedView
              style={[
                styles.statsContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <ThemedText
                style={[styles.statsTitle, { color: colors.primary }]}
              >
                Month Overview
              </ThemedText>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <ThemedText
                    style={[styles.statValue, { color: colors.text }]}
                  >
                    {monthData.length}
                  </ThemedText>
                  <ThemedText
                    style={[styles.statLabel, { color: `${colors.text}80` }]}
                  >
                    Days with Data
                  </ThemedText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <ThemedText
                    style={[styles.statValue, { color: colors.text }]}
                  >
                    {monthData.filter((d) => d.is_ramadan === 1).length}
                  </ThemedText>
                  <ThemedText
                    style={[styles.statLabel, { color: `${colors.text}80` }]}
                  >
                    Ramadan Days
                  </ThemedText>
                </View>
              </View>
            </ThemedView>
          )}

          {/* Legend */}
          <ThemedView style={styles.legend}>
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
      </Animated.ScrollView>

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
              <ThemedText type="subtitle" style={styles.exportModalTitle}>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop:
      Platform.OS === "ios" ? 60 : (StatusBar.currentHeight || 24) + 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exportButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  monthSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
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
  monthButton: {
    padding: 8,
  },
  monthYearDisplay: {
    alignItems: "center",
  },
  monthText: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 2,
  },
  yearText: {
    fontSize: 14,
    fontWeight: "500",
  },
  todayButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
  },
  todayButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
    margin: 20,
    borderRadius: 16,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 16,
  },
  statsContainer: {
    margin: 20,
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
  statsTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendColor: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  legendRamadanIcon: {
    fontSize: 12,
  },
  legendText: {
    fontSize: 14,
    fontWeight: "500",
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
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  exportModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  exportModalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
  },
  exportModalSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  exportOptions: {
    gap: 12,
    marginBottom: 24,
  },
  exportOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  exportOptionText: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  exportOptionSubtext: {
    fontSize: 12,
    fontWeight: "500",
  },
  exportConfirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  exportingButton: {
    opacity: 0.7,
  },
  exportConfirmText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

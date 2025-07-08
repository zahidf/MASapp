import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import React, { useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View, Text, Modal, ScrollView, Animated } from "react-native";

import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { mergeMonthlyIntoYearly, parseMonthlyCSV } from "@/utils/csvParser";
import { getMonthName } from "@/utils/dateHelpers";
import { savePrayerTimes } from "@/utils/storage";
import { firebasePrayerTimesService } from "@/services/firebasePrayerTimes";

interface CSVUploaderProps {
  onUploadComplete?: () => void;
}

export function CSVUploader({ onUploadComplete }: CSVUploaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { prayerTimes, refreshData } = usePrayerTimes();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: getMonthName(i),
  }));

  // Generate year range (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "*/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile(file.name);

        // Read file content
        const content = await FileSystem.readAsStringAsync(file.uri);
        processCSV(content);
      }
    } catch (error) {
      console.error("Error picking file:", error);
      Alert.alert("Error", "Failed to select file");
    }
  };

  const processCSV = async (content: string) => {
    setIsUploading(true);

    try {
      // Parse the monthly CSV
      const monthlyData = parseMonthlyCSV(content);

      if (monthlyData.length === 0) {
        throw new Error("No valid data found in CSV");
      }

      // Validate data
      const expectedDays = new Date(
        selectedYear,
        selectedMonth + 1,
        0
      ).getDate();
      if (monthlyData.length !== expectedDays) {
        Alert.alert(
          "Warning",
          `Expected ${expectedDays} days for ${getMonthName(
            selectedMonth
          )}, but found ${monthlyData.length}. Continue anyway?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Continue", onPress: () => mergeAndSave(monthlyData) },
          ]
        );
        return;
      }

      await mergeAndSave(monthlyData);
    } catch (error) {
      console.error("Error processing CSV:", error);
      Alert.alert(
        "Error",
        "Failed to process CSV file. Please check the format."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const mergeAndSave = async (monthlyData: any[]) => {
    try {
      // Merge with existing data
      const updatedData = mergeMonthlyIntoYearly(
        prayerTimes,
        monthlyData,
        selectedYear,
        selectedMonth + 1
      );

      // Save to local storage (as backup)
      await savePrayerTimes(updatedData);

      // Save to Firebase
      await firebasePrayerTimesService.setPrayerTimes(updatedData);

      // Refresh the app data
      await refreshData();

      Alert.alert(
        "Success",
        `Prayer times for ${getMonthName(
          selectedMonth
        )} ${selectedYear} have been updated and synced to all devices.`
      );

      setSelectedFile(null);
      onUploadComplete?.();
    } catch (error) {
      console.error("Error saving data:", error);
      Alert.alert("Error", "Failed to save updated prayer times. Please check your internet connection and try again.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Month and Year Selectors */}
      <View style={styles.selectorRow}>
        <View style={styles.selectorItem}>
          <Text style={[styles.selectorLabel, { color: colors.secondaryText }]}>
            Month
          </Text>
          <TouchableOpacity
            style={[styles.selectorButton, { backgroundColor: colors.surface, borderColor: colors.separator }]}
            onPress={() => setShowMonthPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectorButtonText, { color: colors.text }]}>
              {getMonthName(selectedMonth)}
            </Text>
            <IconSymbol name="chevron.down" size={16} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>

        <View style={styles.selectorItem}>
          <Text style={[styles.selectorLabel, { color: colors.secondaryText }]}>
            Year
          </Text>
          <TouchableOpacity
            style={[styles.selectorButton, { backgroundColor: colors.surface, borderColor: colors.separator }]}
            onPress={() => setShowYearPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectorButtonText, { color: colors.text }]}>
              {selectedYear}
            </Text>
            <IconSymbol name="chevron.down" size={16} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Upload Button */}
      <TouchableOpacity
        style={[
          styles.uploadButton,
          { backgroundColor: colors.systemOrange },
          isUploading && styles.uploadingButton
        ]}
        onPress={handleFilePick}
        disabled={isUploading}
        activeOpacity={0.8}
      >
        <IconSymbol 
          name={isUploading ? "arrow.trianglehead.clockwise" : "doc.badge.plus"} 
          size={20} 
          color="#FFFFFF" 
        />
        <Text style={styles.uploadButtonText}>
          {isUploading
            ? "Processing..."
            : selectedFile
            ? `Selected: ${selectedFile.length > 20 ? selectedFile.substring(0, 20) + "..." : selectedFile}`
            : "Choose CSV File"}
        </Text>
      </TouchableOpacity>

      {/* Clear Selection */}
      {selectedFile && !isUploading && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => setSelectedFile(null)}
          activeOpacity={0.7}
        >
          <Text style={[styles.clearButtonText, { color: colors.systemRed }]}>
            Clear Selection
          </Text>
        </TouchableOpacity>
      )}

      {/* Month Picker Modal */}
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthPicker(false)}
        >
          <Animated.View
            style={[
              styles.pickerModal,
              { backgroundColor: colors.background }
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Month</Text>
              <TouchableOpacity
                onPress={() => setShowMonthPicker(false)}
                style={[styles.closeButton, { backgroundColor: colors.surface }]}
              >
                <IconSymbol name="xmark" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.monthGrid}>
              {months.map((month) => (
                <TouchableOpacity
                  key={month.value}
                  style={[
                    styles.monthItem,
                    selectedMonth === month.value && { backgroundColor: colors.tint },
                    { borderColor: colors.separator }
                  ]}
                  onPress={() => {
                    setSelectedMonth(month.value);
                    setShowMonthPicker(false);
                  }}
                >
                  <Text style={[
                    styles.monthItemText,
                    { color: selectedMonth === month.value ? "#fff" : colors.text }
                  ]}>
                    {month.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Year Picker Modal */}
      <Modal
        visible={showYearPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowYearPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowYearPicker(false)}
        >
          <Animated.View
            style={[
              styles.pickerModal,
              { backgroundColor: colors.background }
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Year</Text>
              <TouchableOpacity
                onPress={() => setShowYearPicker(false)}
                style={[styles.closeButton, { backgroundColor: colors.surface }]}
              >
                <IconSymbol name="xmark" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.yearList} showsVerticalScrollIndicator={false}>
              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.yearItem,
                    selectedYear === year && { backgroundColor: colors.tint },
                    { borderColor: colors.separator }
                  ]}
                  onPress={() => {
                    setSelectedYear(year);
                    setShowYearPicker(false);
                  }}
                >
                  <Text style={[
                    styles.yearItemText,
                    { color: selectedYear === year ? "#fff" : colors.text }
                  ]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  selectorRow: {
    flexDirection: "row",
    gap: 12,
  },
  selectorItem: {
    flex: 1,
    gap: 8,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: "400",
    letterSpacing: -0.08,
    marginLeft: 4,
  },
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectorButtonText: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.3,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 8,
    minHeight: 44,
  },
  uploadingButton: {
    opacity: 0.7,
  },
  uploadButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  clearButton: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: "400",
    letterSpacing: -0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerModal: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  monthItem: {
    width: "31%",
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  monthItemText: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  yearList: {
    maxHeight: 300,
  },
  yearItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    marginBottom: 8,
  },
  yearItemText: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.3,
  },
});
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import React, { useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useColorScheme } from "@/hooks/useColorScheme";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { mergeMonthlyIntoYearly, parseMonthlyCSV } from "@/utils/csvParser";
import { getMonthName } from "@/utils/dateHelpers";
import { savePrayerTimes } from "@/utils/storage";

interface CSVUploaderProps {
  onUploadComplete?: () => void;
}

export function CSVUploader({ onUploadComplete }: CSVUploaderProps) {
  const colorScheme = useColorScheme();
  const { prayerTimes, refreshData } = usePrayerTimes();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: getMonthName(i),
  }));

  const years = [2024, 2025, 2026].map((year) => ({
    value: year,
    label: year.toString(),
  }));

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

      // Save to storage
      await savePrayerTimes(updatedData);

      // Refresh the app data
      await refreshData();

      Alert.alert(
        "Success",
        `Prayer times for ${getMonthName(
          selectedMonth
        )} ${selectedYear} have been updated.`
      );

      setSelectedFile(null);
      onUploadComplete?.();
    } catch (error) {
      console.error("Error saving data:", error);
      Alert.alert("Error", "Failed to save updated prayer times");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.selectors}>
        <View style={styles.selector}>
          <ThemedText style={styles.selectorLabel}>Month</ThemedText>
          <View style={styles.pickerContainer}>
            {months.map((month) => (
              <TouchableOpacity
                key={month.value}
                style={[
                  styles.monthOption,
                  selectedMonth === month.value && styles.selectedOption,
                ]}
                onPress={() => setSelectedMonth(month.value)}
              >
                <ThemedText
                  style={[
                    styles.optionText,
                    selectedMonth === month.value && styles.selectedText,
                  ]}
                >
                  {month.label.substring(0, 3)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.selector}>
          <ThemedText style={styles.selectorLabel}>Year</ThemedText>
          <View style={styles.yearPickerContainer}>
            {years.map((year) => (
              <TouchableOpacity
                key={year.value}
                style={[
                  styles.yearOption,
                  selectedYear === year.value && styles.selectedOption,
                ]}
                onPress={() => setSelectedYear(year.value)}
              >
                <ThemedText
                  style={[
                    styles.optionText,
                    selectedYear === year.value && styles.selectedText,
                  ]}
                >
                  {year.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.uploadButton, isUploading && styles.uploadingButton]}
        onPress={handleFilePick}
        disabled={isUploading}
      >
        <IconSymbol name="doc.text" size={24} color="#fff" />
        <ThemedText style={styles.uploadButtonText}>
          {isUploading
            ? "Processing..."
            : selectedFile
            ? `Selected: ${selectedFile}`
            : "Select CSV File"}
        </ThemedText>
      </TouchableOpacity>

      {selectedFile && !isUploading && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => setSelectedFile(null)}
        >
          <ThemedText style={styles.clearButtonText}>
            Clear Selection
          </ThemedText>
        </TouchableOpacity>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  selectors: {
    gap: 12,
  },
  selector: {
    gap: 8,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.8,
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  yearPickerContainer: {
    flexDirection: "row",
    gap: 8,
  },
  monthOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    minWidth: 45,
    alignItems: "center",
  },
  yearOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  selectedOption: {
    backgroundColor: "#1B5E20",
  },
  optionText: {
    fontSize: 14,
  },
  selectedText: {
    color: "#fff",
    fontWeight: "600",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#F9A825",
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  uploadingButton: {
    opacity: 0.7,
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  clearButton: {
    alignItems: "center",
    padding: 8,
  },
  clearButtonText: {
    color: "#d32f2f",
    fontSize: 14,
  },
});

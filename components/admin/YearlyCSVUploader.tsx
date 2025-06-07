import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import React, { useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useColorScheme } from "@/hooks/useColorScheme";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { parseYearlyCSV, validateYearlyData } from "@/utils/csvParser";
import { savePrayerTimes } from "@/utils/storage";

interface YearlyCSVUploaderProps {
  onUploadComplete?: () => void;
}

export function YearlyCSVUploader({
  onUploadComplete,
}: YearlyCSVUploaderProps) {
  const colorScheme = useColorScheme();
  const { refreshData } = usePrayerTimes();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    totalRows: number;
    dateRange: string;
    sampleDates: string[];
  } | null>(null);

  const years = [2023, 2024, 2025, 2026, 2027].map((year) => ({
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

        // Read and preview file content
        const content = await FileSystem.readAsStringAsync(file.uri);
        await previewCSV(content);
      }
    } catch (error) {
      console.error("Error picking file:", error);
      Alert.alert("Error", "Failed to select file");
    }
  };

  const previewCSV = async (content: string) => {
    try {
      const yearlyData = parseYearlyCSV(content);

      if (yearlyData.length === 0) {
        throw new Error("No valid data found in CSV");
      }

      // Create preview info
      const dates = yearlyData
        .map((row) => row.d_date)
        .filter(Boolean)
        .sort();
      const preview = {
        totalRows: yearlyData.length,
        dateRange:
          dates.length > 0
            ? `${dates[0]} to ${dates[dates.length - 1]}`
            : "No dates found",
        sampleDates: dates.slice(0, 5), // First 5 dates as sample
      };

      setPreviewData(preview);

      // Validate the data
      const validation = validateYearlyData(yearlyData);

      if (!validation.isValid) {
        Alert.alert(
          "Validation Errors",
          `Found ${validation.errors.length} errors:\n\n${validation.errors
            .slice(0, 3)
            .join("\n")}\n${
            validation.errors.length > 3
              ? `\n...and ${validation.errors.length - 3} more errors`
              : ""
          }`,
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => clearSelection(),
            },
            {
              text: "Upload Anyway",
              style: "destructive",
              onPress: () => processCSV(content),
            },
          ]
        );
        return;
      }

      if (validation.warnings.length > 0) {
        Alert.alert(
          "Validation Warnings",
          `Found ${
            validation.warnings.length
          } warnings:\n\n${validation.warnings.slice(0, 3).join("\n")}\n${
            validation.warnings.length > 3
              ? `\n...and ${validation.warnings.length - 3} more warnings`
              : ""
          }\n\nDo you want to continue?`,
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => clearSelection(),
            },
            { text: "Continue", onPress: () => processCSV(content) },
          ]
        );
        return;
      }

      // If no errors or warnings, show confirmation
      Alert.alert(
        "Confirm Upload",
        `Ready to upload yearly prayer times:\n\n• ${yearlyData.length} days of data\n• Date range: ${preview.dateRange}\n• This will replace ALL existing data\n\nContinue?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upload", onPress: () => processCSV(content) },
        ]
      );
    } catch (error) {
      console.error("Error previewing CSV:", error);
      Alert.alert(
        "Error",
        "Failed to parse CSV file. Please check the format and try again."
      );
      clearSelection();
    }
  };

  const processCSV = async (content: string) => {
    setIsUploading(true);

    try {
      // Parse the yearly CSV
      const yearlyData = parseYearlyCSV(content);

      // Save to storage (this replaces all existing data)
      await savePrayerTimes(yearlyData);

      // Refresh the app data
      await refreshData();

      Alert.alert(
        "Success",
        `Yearly prayer times have been uploaded successfully!\n\n• ${yearlyData.length} days imported\n• Data year: ${selectedYear}`
      );

      clearSelection();
      onUploadComplete?.();
    } catch (error) {
      console.error("Error processing CSV:", error);
      Alert.alert("Error", "Failed to process and save yearly prayer times");
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewData(null);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.yearSelector}>
        <ThemedText style={styles.selectorLabel}>Target Year</ThemedText>
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
            : "Select Yearly CSV File"}
        </ThemedText>
      </TouchableOpacity>

      {previewData && (
        <ThemedView style={styles.previewCard}>
          <ThemedText style={styles.previewTitle}>File Preview</ThemedText>
          <View style={styles.previewRow}>
            <ThemedText style={styles.previewLabel}>Total Days:</ThemedText>
            <ThemedText style={styles.previewValue}>
              {previewData.totalRows}
            </ThemedText>
          </View>
          <View style={styles.previewRow}>
            <ThemedText style={styles.previewLabel}>Date Range:</ThemedText>
            <ThemedText style={styles.previewValue}>
              {previewData.dateRange}
            </ThemedText>
          </View>
          <View style={styles.previewRow}>
            <ThemedText style={styles.previewLabel}>Sample Dates:</ThemedText>
            <ThemedText style={styles.previewValue}>
              {previewData.sampleDates.join(", ")}
            </ThemedText>
          </View>
        </ThemedView>
      )}

      {selectedFile && !isUploading && (
        <TouchableOpacity style={styles.clearButton} onPress={clearSelection}>
          <ThemedText style={styles.clearButtonText}>
            Clear Selection
          </ThemedText>
        </TouchableOpacity>
      )}

      <ThemedView style={styles.infoCard}>
        <ThemedText style={styles.infoTitle}>
          📄 CSV Format Requirements
        </ThemedText>
        <ThemedText style={styles.infoText}>
          • Header row with field names{"\n"}• d_date: YYYY-MM-DD format{"\n"}•
          Prayer times: HH:MM:SS or HH:MM format{"\n"}• Required: fajr_begins,
          zuhr_begins, asr_mithl_1, maghrib_begins, isha_begins{"\n"}• Optional:
          jamah times, hijri_date, is_ramadan
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.warningCard}>
        <IconSymbol name="exclamationmark.triangle" size={20} color="#FF9800" />
        <ThemedText style={styles.warningText}>
          Warning: This will replace ALL existing prayer time data. Make sure to
          backup current data before proceeding.
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  yearSelector: {
    gap: 8,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.8,
  },
  yearPickerContainer: {
    flexDirection: "row",
    gap: 8,
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
    backgroundColor: "#2E7D32",
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
  previewCard: {
    backgroundColor: "#E8F5E9",
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#2E7D32",
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
    opacity: 0.8,
    flex: 1,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  clearButton: {
    alignItems: "center",
    padding: 8,
  },
  clearButtonText: {
    color: "#d32f2f",
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#1976D2",
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#1976D2",
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FFF3E0",
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#E65100",
    flex: 1,
  },
});

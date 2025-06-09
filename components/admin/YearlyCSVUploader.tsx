import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import React, { useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
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
  const colors = Colors[colorScheme ?? "light"];
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
        <ThemedText
          style={[styles.selectorLabel, { color: `${colors.text}CC` }]}
        >
          Target Year
        </ThemedText>
        <View style={styles.yearPickerContainer}>
          {years.map((year) => (
            <TouchableOpacity
              key={year.value}
              style={[
                styles.yearOption,
                {
                  backgroundColor:
                    selectedYear === year.value
                      ? colors.primary
                      : `${colors.text}10`,
                },
              ]}
              onPress={() => setSelectedYear(year.value)}
            >
              <ThemedText
                style={[
                  styles.optionText,
                  { color: selectedYear === year.value ? "#fff" : colors.text },
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
        <ThemedView
          style={[
            styles.previewCard,
            {
              backgroundColor: colorScheme === "dark" ? "#2E7D32" : "#E8F5E9",
              borderLeftColor: colorScheme === "dark" ? "#81C784" : "#4CAF50",
            },
          ]}
        >
          <ThemedText
            style={[
              styles.previewTitle,
              {
                color: colorScheme === "dark" ? "#81C784" : "#2E7D32",
              },
            ]}
          >
            File Preview
          </ThemedText>
          <View style={styles.previewRow}>
            <ThemedText
              style={[
                styles.previewLabel,
                {
                  color: `${colorScheme === "dark" ? "#81C784" : "#2E7D32"}CC`,
                },
              ]}
            >
              Total Days:
            </ThemedText>
            <ThemedText
              style={[
                styles.previewValue,
                {
                  color: colorScheme === "dark" ? "#81C784" : "#2E7D32",
                },
              ]}
            >
              {previewData.totalRows}
            </ThemedText>
          </View>
          <View style={styles.previewRow}>
            <ThemedText
              style={[
                styles.previewLabel,
                {
                  color: `${colorScheme === "dark" ? "#81C784" : "#2E7D32"}CC`,
                },
              ]}
            >
              Date Range:
            </ThemedText>
            <ThemedText
              style={[
                styles.previewValue,
                {
                  color: colorScheme === "dark" ? "#81C784" : "#2E7D32",
                },
              ]}
            >
              {previewData.dateRange}
            </ThemedText>
          </View>
          <View style={styles.previewRow}>
            <ThemedText
              style={[
                styles.previewLabel,
                {
                  color: `${colorScheme === "dark" ? "#81C784" : "#2E7D32"}CC`,
                },
              ]}
            >
              Sample Dates:
            </ThemedText>
            <ThemedText
              style={[
                styles.previewValue,
                {
                  color: colorScheme === "dark" ? "#81C784" : "#2E7D32",
                },
              ]}
            >
              {previewData.sampleDates.join(", ")}
            </ThemedText>
          </View>
        </ThemedView>
      )}

      {selectedFile && !isUploading && (
        <TouchableOpacity style={styles.clearButton} onPress={clearSelection}>
          <ThemedText style={[styles.clearButtonText, { color: colors.error }]}>
            Clear Selection
          </ThemedText>
        </TouchableOpacity>
      )}

      <ThemedView
        style={[
          styles.infoCard,
          {
            backgroundColor: colorScheme === "dark" ? "#1565C0" : "#E3F2FD",
            borderLeftColor: colorScheme === "dark" ? "#42A5F5" : "#2196F3",
          },
        ]}
      >
        <ThemedText
          style={[
            styles.infoTitle,
            {
              color: colorScheme === "dark" ? "#42A5F5" : "#1976D2",
            },
          ]}
        >
          📄 CSV Format Requirements
        </ThemedText>
        <ThemedText
          style={[
            styles.infoText,
            {
              color: colorScheme === "dark" ? "#42A5F5" : "#1976D2",
            },
          ]}
        >
          • Header row with field names{"\n"}• d_date: YYYY-MM-DD format{"\n"}•
          Prayer times: HH:MM:SS or HH:MM format{"\n"}• Required: fajr_begins,
          zuhr_begins, asr_mithl_1, maghrib_begins, isha_begins{"\n"}• Optional:
          jamah times, hijri_date, is_ramadan
        </ThemedText>
      </ThemedView>

      <ThemedView
        style={[
          styles.warningCard,
          {
            backgroundColor: colorScheme === "dark" ? "#E65100" : "#FFF3E0",
            borderLeftColor: colorScheme === "dark" ? "#FF9800" : "#FF9800",
          },
        ]}
      >
        <IconSymbol name="exclamationmark.triangle" size={20} color="#FF9800" />
        <ThemedText
          style={[
            styles.warningText,
            {
              color: colorScheme === "dark" ? "#FFB74D" : "#E65100",
            },
          ]}
        >
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
  },
  yearPickerContainer: {
    flexDirection: "row",
    gap: 8,
  },
  yearOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  optionText: {
    fontSize: 14,
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
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
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
    fontSize: 14,
  },
  infoCard: {
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});

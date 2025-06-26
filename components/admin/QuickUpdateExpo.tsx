import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Modal,
  Animated,
  Text,
  Switch,
} from "react-native";
import { BlurView } from "expo-blur";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { PrayerTime } from "@/types/prayer";
import { savePrayerTimes } from "@/utils/storage";

interface QuickUpdateProps {
  onUpdateComplete?: () => void;
}

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  value: Date;
  onChange: (date: Date) => void;
  colorScheme: "light" | "dark";
  colors: any;
}

function DatePickerModal({
  visible,
  onClose,
  value,
  onChange,
  colorScheme,
  colors,
}: DatePickerModalProps) {
  const [slideAnim] = useState(new Animated.Value(0));
  
  // Ensure value is a valid Date object
  const safeValue = value && value instanceof Date && !isNaN(value.getTime()) ? value : new Date();
  
  const [selectedYear, setSelectedYear] = useState(safeValue.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(safeValue.getMonth());
  const [selectedDay, setSelectedDay] = useState(safeValue.getDate());

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  useEffect(() => {
    if (visible) {
      const safeValue = value && value instanceof Date && !isNaN(value.getTime()) ? value : new Date();
      setSelectedYear(safeValue.getFullYear());
      setSelectedMonth(safeValue.getMonth());
      setSelectedDay(safeValue.getDate());
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, value]);

  const handleDone = () => {
    const newDate = new Date(selectedYear, selectedMonth, selectedDay);
    onChange(newDate);
    onClose();
  };

  const renderDays = () => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const days = [];
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.dayButton,
            selectedDay === i && { backgroundColor: colors.primary },
            { borderColor: colors.text + "20" }
          ]}
          onPress={() => setSelectedDay(i)}
        >
          <Text style={[
            styles.dayText,
            { color: selectedDay === i ? "#fff" : colors.text }
          ]}>
            {i}
          </Text>
        </TouchableOpacity>
      );
    }
    
    return days;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.dateModalContainer,
            {
              backgroundColor: colors.background,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.modalHandle}>
            <View
              style={[
                styles.modalHandleBar,
                { backgroundColor: colors.text + "30" },
              ]}
            />
          </View>

          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.modalButton}>
              <ThemedText style={[styles.modalButtonText, { color: colors.primary }]}>
                Cancel
              </ThemedText>
            </TouchableOpacity>
            
            <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
              Select Date
            </ThemedText>
            
            <TouchableOpacity onPress={handleDone} style={styles.modalButton}>
              <ThemedText style={[styles.modalButtonText, { color: colors.primary, fontWeight: "600" }]}>
                Done
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Month and Year Selectors */}
          <View style={styles.monthYearRow}>
            <TouchableOpacity
              style={[styles.monthYearButton, { backgroundColor: colors.surface }]}
              onPress={() => setSelectedMonth(selectedMonth === 0 ? 11 : selectedMonth - 1)}
            >
              <IconSymbol name="chevron.left" size={20} color={colors.text} />
            </TouchableOpacity>
            
            <View style={styles.monthYearText}>
              <Text style={[styles.monthText, { color: colors.text }]}>
                {months[selectedMonth]}
              </Text>
              <Text style={[styles.yearText, { color: colors.text + "80" }]}>
                {selectedYear}
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.monthYearButton, { backgroundColor: colors.surface }]}
              onPress={() => setSelectedMonth(selectedMonth === 11 ? 0 : selectedMonth + 1)}
            >
              <IconSymbol name="chevron.right" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Year Adjustment */}
          <View style={styles.yearAdjustRow}>
            <TouchableOpacity
              style={[styles.yearButton, { backgroundColor: colors.surface }]}
              onPress={() => setSelectedYear(selectedYear - 1)}
            >
              <Text style={[styles.yearButtonText, { color: colors.text }]}>
                {selectedYear - 1}
              </Text>
            </TouchableOpacity>
            
            <View style={[styles.currentYearBox, { backgroundColor: colors.primary + "15" }]}>
              <Text style={[styles.currentYearText, { color: colors.primary }]}>
                {selectedYear}
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.yearButton, { backgroundColor: colors.surface }]}
              onPress={() => setSelectedYear(selectedYear + 1)}
            >
              <Text style={[styles.yearButtonText, { color: colors.text }]}>
                {selectedYear + 1}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Days Grid */}
          <ScrollView style={styles.daysContainer}>
            <View style={styles.daysGrid}>
              {renderDays()}
            </View>
          </ScrollView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  value: Date;
  onChange: (date: Date) => void;
  title: string;
  colorScheme: "light" | "dark";
  colors: any;
}

function TimePickerModal({
  visible,
  onClose,
  value,
  onChange,
  title,
  colorScheme,
  colors,
}: TimePickerModalProps) {
  const [slideAnim] = useState(new Animated.Value(0));
  
  // Ensure value is a valid Date object
  const safeValue = value && value instanceof Date && !isNaN(value.getTime()) ? value : new Date();
  
  const [hours, setHours] = useState(safeValue.getHours() % 12 || 12);
  const [minutes, setMinutes] = useState(safeValue.getMinutes());
  const [isAM, setIsAM] = useState(safeValue.getHours() < 12);

  useEffect(() => {
    if (visible) {
      const safeValue = value && value instanceof Date && !isNaN(value.getTime()) ? value : new Date();
      setHours(safeValue.getHours() % 12 || 12);
      setMinutes(safeValue.getMinutes());
      setIsAM(safeValue.getHours() < 12);
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, value]);

  const handleDone = () => {
    const newDate = new Date();
    let actualHours = hours;
    if (!isAM && hours !== 12) {
      actualHours = hours + 12;
    } else if (isAM && hours === 12) {
      actualHours = 0;
    }
    newDate.setHours(actualHours, minutes, 0, 0);
    onChange(newDate);
    onClose();
  };

  const incrementHours = () => {
    setHours(hours === 12 ? 1 : hours + 1);
  };

  const decrementHours = () => {
    setHours(hours === 1 ? 12 : hours - 1);
  };

  const incrementMinutes = () => {
    setMinutes(minutes === 59 ? 0 : minutes + 1);
  };

  const decrementMinutes = () => {
    setMinutes(minutes === 0 ? 59 : minutes - 1);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.background,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.modalHandle}>
            <View
              style={[
                styles.modalHandleBar,
                { backgroundColor: colors.text + "30" },
              ]}
            />
          </View>

          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.modalButton}>
              <ThemedText style={[styles.modalButtonText, { color: colors.primary }]}>
                Cancel
              </ThemedText>
            </TouchableOpacity>
            
            <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
              {title}
            </ThemedText>
            
            <TouchableOpacity onPress={handleDone} style={styles.modalButton}>
              <ThemedText style={[styles.modalButtonText, { color: colors.primary, fontWeight: "600" }]}>
                Done
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Custom Time Picker */}
          <View style={styles.customTimePicker}>
            <View style={styles.timeColumn}>
              <TouchableOpacity onPress={incrementHours} style={styles.timeButton}>
                <IconSymbol name="chevron.up" size={24} color={colors.text + "60"} />
              </TouchableOpacity>
              <View style={[styles.timeDisplay, { backgroundColor: colors.surface }]}>
                <Text style={[styles.timeText, { color: colors.text }]}>
                  {hours.toString().padStart(2, "0")}
                </Text>
              </View>
              <TouchableOpacity onPress={decrementHours} style={styles.timeButton}>
                <IconSymbol name="chevron.down" size={24} color={colors.text + "60"} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.timeSeparator, { color: colors.text }]}>:</Text>

            <View style={styles.timeColumn}>
              <TouchableOpacity onPress={incrementMinutes} style={styles.timeButton}>
                <IconSymbol name="chevron.up" size={24} color={colors.text + "60"} />
              </TouchableOpacity>
              <View style={[styles.timeDisplay, { backgroundColor: colors.surface }]}>
                <Text style={[styles.timeText, { color: colors.text }]}>
                  {minutes.toString().padStart(2, "0")}
                </Text>
              </View>
              <TouchableOpacity onPress={decrementMinutes} style={styles.timeButton}>
                <IconSymbol name="chevron.down" size={24} color={colors.text + "60"} />
              </TouchableOpacity>
            </View>

            <View style={styles.amPmColumn}>
              <TouchableOpacity
                style={[
                  styles.amPmButton,
                  isAM && { backgroundColor: colors.primary },
                ]}
                onPress={() => setIsAM(true)}
              >
                <Text style={[styles.amPmText, { color: isAM ? "#fff" : colors.text }]}>
                  AM
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.amPmButton,
                  !isAM && { backgroundColor: colors.primary },
                ]}
                onPress={() => setIsAM(false)}
              >
                <Text style={[styles.amPmText, { color: !isAM ? "#fff" : colors.text }]}>
                  PM
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

export function QuickUpdate({ onUpdateComplete }: QuickUpdateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { prayerTimes, refreshData } = usePrayerTimes();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTimePicker, setActiveTimePicker] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  
  // Prayer times state
  const [prayerTimeValues, setPrayerTimeValues] = useState({
    fajr_begins: new Date(),
    fajr_jamah: new Date(),
    sunrise: new Date(),
    sunrise_begins: new Date(), // Added for consistency with the prayer key pattern
    zuhr_begins: new Date(),
    zuhr_jamah: new Date(),
    asr_begins: new Date(),
    asr_jamah: new Date(),
    maghrib_begins: new Date(),
    maghrib_jamah: new Date(),
    isha_begins: new Date(),
    isha_jamah: new Date(),
  });

  // Auto-update Jamah times
  const [autoJamah, setAutoJamah] = useState({
    fajr: false,
    zuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
  });

  // Load existing prayer times for selected date
  useEffect(() => {
    const dateStr = `${selectedDate.getFullYear()}-${String(
      selectedDate.getMonth() + 1
    ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    
    const existingTime = prayerTimes.find((pt) => pt.d_date === dateStr);
    if (existingTime) {
      // Convert time strings to Date objects
      const newValues: any = {};
      Object.keys(prayerTimeValues).forEach((key) => {
        // Handle special case for sunrise_begins which maps to sunrise in the data
        const dataKey = key === 'sunrise_begins' ? 'sunrise' : key;
        const timeStr = (existingTime as any)[dataKey];
        if (timeStr) {
          const [hours, minutes] = timeStr.split(":").map(Number);
          const date = new Date();
          date.setHours(hours, minutes, 0, 0);
          newValues[key] = date;
        } else {
          // If no time string exists, use current date as default
          newValues[key] = new Date();
        }
      });
      // Ensure sunrise and sunrise_begins are synced
      if (newValues.sunrise && !newValues.sunrise_begins) {
        newValues.sunrise_begins = newValues.sunrise;
      } else if (newValues.sunrise_begins && !newValues.sunrise) {
        newValues.sunrise = newValues.sunrise_begins;
      }
      setPrayerTimeValues(newValues);
    }
  }, [selectedDate, prayerTimes]);

  const formatTime = (date: Date): string => {
    // Ensure date is a valid Date object
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return "12:00 AM"; // Default time if invalid
    }
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const formatTimeForStorage = (date: Date): string => {
    // Ensure date is a valid Date object
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return "00:00"; // Default time if invalid
    }
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const handleTimeChange = (prayer: string, type: string, newTime: Date) => {
    setPrayerTimeValues((prev) => ({
      ...prev,
      [`${prayer}_${type}`]: newTime,
    }));

    // Auto-update Jamah time if enabled
    if (type === "begins" && (autoJamah as any)[prayer]) {
      const jamahTime = new Date(newTime);
      jamahTime.setMinutes(newTime.getMinutes() + 10); // Add 10 minutes
      setPrayerTimeValues((prev) => ({
        ...prev,
        [`${prayer}_jamah`]: jamahTime,
      }));
    }
  };

  const handleSave = async () => {
    setIsUpdating(true);

    try {
      const dateStr = `${selectedDate.getFullYear()}-${String(
        selectedDate.getMonth() + 1
      ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

      // Create updated prayer time object
      const updatedPrayerTime: PrayerTime = {
        d_date: dateStr,
        fajr_begins: formatTimeForStorage(prayerTimeValues.fajr_begins),
        fajr_jamah: formatTimeForStorage(prayerTimeValues.fajr_jamah),
        sunrise: formatTimeForStorage(prayerTimeValues.sunrise_begins || prayerTimeValues.sunrise),
        zuhr_begins: formatTimeForStorage(prayerTimeValues.zuhr_begins),
        zuhr_jamah: formatTimeForStorage(prayerTimeValues.zuhr_jamah),
        asr_mithl_1: formatTimeForStorage(prayerTimeValues.asr_begins),
        asr_mithl_2: formatTimeForStorage(prayerTimeValues.asr_begins), // Same as asr_mithl_1 for now
        asr_jamah: formatTimeForStorage(prayerTimeValues.asr_jamah),
        maghrib_begins: formatTimeForStorage(prayerTimeValues.maghrib_begins),
        maghrib_jamah: formatTimeForStorage(prayerTimeValues.maghrib_jamah),
        isha_begins: formatTimeForStorage(prayerTimeValues.isha_begins),
        isha_jamah: formatTimeForStorage(prayerTimeValues.isha_jamah),
        is_ramadan: 0, // Default, can be updated separately
        hijri_date: "", // Default, can be calculated separately
      };

      // Update prayer times array
      const updatedPrayerTimes = [...prayerTimes];
      const existingIndex = updatedPrayerTimes.findIndex(
        (pt) => pt.d_date === dateStr
      );

      if (existingIndex !== -1) {
        updatedPrayerTimes[existingIndex] = updatedPrayerTime;
      } else {
        // Insert in correct position to maintain date order
        const insertIndex = updatedPrayerTimes.findIndex(
          (pt) => pt.d_date > dateStr
        );
        if (insertIndex === -1) {
          updatedPrayerTimes.push(updatedPrayerTime);
        } else {
          updatedPrayerTimes.splice(insertIndex, 0, updatedPrayerTime);
        }
      }

      // Save to storage
      await savePrayerTimes(updatedPrayerTimes);
      await refreshData();

      Alert.alert(
        "Success",
        `Prayer times for ${selectedDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })} have been updated.`
      );

      onUpdateComplete?.();
    } catch (error) {
      console.error("Error updating prayer times:", error);
      Alert.alert("Error", "Failed to update prayer times.");
    } finally {
      setIsUpdating(false);
    }
  };

  const prayers = [
    { key: "fajr", name: "Fajr", icon: "sunrise", hasJamah: true },
    { key: "sunrise", name: "Sunrise", icon: "sun.max", hasJamah: false },
    { key: "zuhr", name: "Zuhr", icon: "sun.max.fill", hasJamah: true },
    { key: "asr", name: "Asr", icon: "sun.min", hasJamah: true },
    { key: "maghrib", name: "Maghrib", icon: "sunset", hasJamah: true },
    { key: "isha", name: "Isha", icon: "moon.stars", hasJamah: true },
  ];

  return (
    <ThemedView style={styles.container}>
      {/* Date Selector */}
      <View style={styles.dateSection}>
        <ThemedText style={[styles.sectionLabel, { color: colors.text + "80" }]}>
          Select Date
        </ThemedText>
        <TouchableOpacity
          style={[
            styles.dateButton,
            {
              backgroundColor: colors.surface,
              borderColor: colorScheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            },
          ]}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.dateIconContainer, { backgroundColor: colors.primary + "15" }]}>
            <IconSymbol name="calendar" size={20} color={colors.primary} />
          </View>
          <ThemedText style={[styles.dateText, { color: colors.text }]}>
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </ThemedText>
          <IconSymbol name="chevron.right" size={16} color={colors.text + "40"} />
        </TouchableOpacity>
      </View>

      {/* Prayer Times */}
      <ScrollView
        style={styles.prayersList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.prayersContent}
      >
        {prayers.map((prayer) => (
          <BlurView
            key={prayer.key}
            intensity={60}
            tint={colorScheme === "dark" ? "dark" : "light"}
            style={[
              styles.prayerCard,
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
              style={styles.prayerHeader}
              onPress={() => setExpandedCard(expandedCard === prayer.key ? null : prayer.key)}
              activeOpacity={0.7}
            >
              <View style={styles.prayerInfo}>
                <View style={[styles.prayerIconContainer, { backgroundColor: colors.primary + "15" }]}>
                  <IconSymbol name={prayer.icon as any} size={22} color={colors.primary} />
                </View>
                <ThemedText style={[styles.prayerName, { color: colors.text }]}>
                  {prayer.name}
                </ThemedText>
              </View>
              <IconSymbol
                name={expandedCard === prayer.key ? "chevron.up" : "chevron.down"}
                size={20}
                color={colors.text + "60"}
              />
            </TouchableOpacity>

            {expandedCard === prayer.key && (
              <View style={styles.prayerContent}>
                {/* Begin Time */}
                <TouchableOpacity
                  style={[styles.timeRow, { borderBottomColor: colors.text + "10" }]}
                  onPress={() => setActiveTimePicker(`${prayer.key}_begins`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.timeInfo}>
                    <ThemedText style={[styles.timeLabel, { color: colors.text + "60" }]}>
                      {prayer.hasJamah ? "Begin Time" : "Time"}
                    </ThemedText>
                    <ThemedText style={[styles.timeValue, { color: colors.text }]}>
                      {formatTime((prayerTimeValues as any)[`${prayer.key}_begins`] || new Date())}
                    </ThemedText>
                  </View>
                  <IconSymbol name="clock" size={20} color={colors.primary} />
                </TouchableOpacity>

                {/* Jamah Time */}
                {prayer.hasJamah && (
                  <>
                    <TouchableOpacity
                      style={[styles.timeRow, { borderBottomColor: colors.text + "10" }]}
                      onPress={() => setActiveTimePicker(`${prayer.key}_jamah`)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.timeInfo}>
                        <ThemedText style={[styles.timeLabel, { color: colors.text + "60" }]}>
                          Jamah Time
                        </ThemedText>
                        <ThemedText style={[styles.timeValue, { color: colors.text }]}>
                          {formatTime((prayerTimeValues as any)[`${prayer.key}_jamah`] || new Date())}
                        </ThemedText>
                      </View>
                      <IconSymbol name="clock.fill" size={20} color={colors.primary} />
                    </TouchableOpacity>

                    {/* Auto Jamah Toggle */}
                    <View style={styles.autoJamahRow}>
                      <View style={styles.autoJamahInfo}>
                        <ThemedText style={[styles.autoJamahLabel, { color: colors.text }]}>
                          Auto-update Jamah
                        </ThemedText>
                        <ThemedText style={[styles.autoJamahDescription, { color: colors.text + "60" }]}>
                          Set Jamah 10 minutes after Begin time
                        </ThemedText>
                      </View>
                      <Switch
                        value={(autoJamah as any)[prayer.key]}
                        onValueChange={(value) => {
                          setAutoJamah((prev) => ({ ...prev, [prayer.key]: value }));
                          if (value) {
                            const beginTime = (prayerTimeValues as any)[`${prayer.key}_begins`];
                            const jamahTime = new Date(beginTime);
                            jamahTime.setMinutes(beginTime.getMinutes() + 10);
                            handleTimeChange(prayer.key, "jamah", jamahTime);
                          }
                        }}
                        trackColor={{
                          false: colors.text + "20",
                          true: colors.primary + "60",
                        }}
                        thumbColor={(autoJamah as any)[prayer.key] ? colors.primary : "#f4f3f4"}
                      />
                    </View>
                  </>
                )}
              </View>
            )}
          </BlurView>
        ))}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor: colors.primary,
              opacity: isUpdating ? 0.7 : 1,
            },
          ]}
          onPress={handleSave}
          disabled={isUpdating}
          activeOpacity={0.8}
        >
          <IconSymbol name="checkmark.circle.fill" size={24} color="#fff" />
          <ThemedText style={styles.saveButtonText}>
            {isUpdating ? "Updating..." : "Save Changes"}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        value={selectedDate}
        onChange={(date) => {
          setSelectedDate(date);
          setShowDatePicker(false);
        }}
        colorScheme={colorScheme ?? "light"}
        colors={colors}
      />

      {/* Time Picker Modal */}
      {activeTimePicker && (
        <TimePickerModal
          visible={!!activeTimePicker}
          onClose={() => setActiveTimePicker(null)}
          value={(prayerTimeValues as any)[activeTimePicker] || new Date()}
          onChange={(newTime) => {
            const [prayer, type] = activeTimePicker.split("_");
            handleTimeChange(prayer, type, newTime);
          }}
          title={
            activeTimePicker.includes("jamah")
              ? `${activeTimePicker.split("_")[0].charAt(0).toUpperCase() + activeTimePicker.split("_")[0].slice(1)} Jamah Time`
              : `${activeTimePicker.split("_")[0].charAt(0).toUpperCase() + activeTimePicker.split("_")[0].slice(1)} Begin Time`
          }
          colorScheme={colorScheme ?? "light"}
          colors={colors}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Date Section
  dateSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.08,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  dateIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  dateText: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },

  // Prayer Cards
  prayersList: {
    flex: 1,
  },
  prayersContent: {
    gap: 12,
    paddingBottom: 20,
  },
  prayerCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  prayerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  prayerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  prayerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  prayerName: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  prayerContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  // Time Rows
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeInfo: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 13,
    letterSpacing: -0.08,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },

  // Auto Jamah
  autoJamahRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    paddingBottom: 4,
  },
  autoJamahInfo: {
    flex: 1,
    marginRight: 16,
  },
  autoJamahLabel: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  autoJamahDescription: {
    fontSize: 13,
    letterSpacing: -0.08,
    marginTop: 2,
  },

  // Save Button
  saveButtonContainer: {
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 20 : 16,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  modalHandle: {
    alignItems: "center",
    paddingVertical: 10,
  },
  modalHandleBar: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalButton: {
    padding: 8,
    minWidth: 60,
  },
  modalButtonText: {
    fontSize: 17,
    letterSpacing: -0.4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },

  // Custom Time Picker Styles
  customTimePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  timeColumn: {
    alignItems: "center",
    gap: 8,
  },
  timeButton: {
    padding: 8,
    borderRadius: 8,
  },
  timeDisplay: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 80,
    alignItems: "center",
  },
  timeText: {
    fontSize: 32,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: "600",
    letterSpacing: -0.5,
    paddingHorizontal: 8,
  },
  amPmColumn: {
    gap: 8,
    marginLeft: 16,
  },
  amPmButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 60,
    alignItems: "center",
  },
  amPmText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },

  // Date Picker Modal
  dateModalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    maxHeight: "80%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  monthYearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  monthYearButton: {
    padding: 12,
    borderRadius: 10,
  },
  monthYearText: {
    alignItems: "center",
  },
  monthText: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  yearText: {
    fontSize: 15,
    letterSpacing: -0.2,
    marginTop: 2,
  },
  yearAdjustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  yearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  yearButtonText: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  currentYearBox: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  currentYearText: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  daysContainer: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dayText: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.3,
  },
});
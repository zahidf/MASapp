import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Animated,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { CSVUploader } from "@/components/admin/CSVUploader";
import { YearlyCSVUploader } from "@/components/admin/YearlyCSVUploader";
import { QuickUpdate } from "@/components/admin/QuickUpdateExpo";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useColorScheme } from "@/hooks/useColorScheme";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { clearAllData, getLastUpdateTime, loadPrayerTimes } from "@/utils/storage";
import { generateCSVContent, generateMonthlyCSVContent } from "@/utils/csvParser";
import { getMonthName } from "@/utils/dateHelpers";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

// Custom hook for admin authentication guard
function useAdminAuthGuard() {
  const { user } = useAuth();
  const isDev = __DEV__;

  React.useEffect(() => {
    // In production, redirect to login if not admin
    if (!isDev && !user?.isAdmin) {
      router.push("/auth/login");
    }
  }, [user, isDev]);

  return {
    isAuthenticated: !!user?.isAdmin,
    isLoading: !isDev && !user?.isAdmin,
    user,
  };
}

export default function AdminScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { logout, devLogin } = useAuth();
  const { refreshData } = usePrayerTimes();
  const [lastUpdate, setLastUpdate] = React.useState<string | null>(null);
  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [headerAnim] = React.useState(new Animated.Value(0));

  // Use auth guard
  const { isAuthenticated, isLoading, user } = useAdminAuthGuard();

  React.useEffect(() => {
    if (isAuthenticated) {
      loadLastUpdate();

      // Fade in animation
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
    }
  }, [isAuthenticated]);

  const loadLastUpdate = async () => {
    try {
      const timestamp = await getLastUpdateTime();
      setLastUpdate(timestamp);
    } catch (error) {
      console.error("Error loading last update:", error);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will delete all prayer times and user data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Data",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllData();
              await refreshData();
              setLastUpdate(null);
              Alert.alert("Success", "All data has been cleared.");
            } catch (error) {
              Alert.alert("Error", "Failed to clear data.");
            }
          },
        },
      ]
    );
  };

  const handleResetNotificationSetup = async () => {
    Alert.alert(
      "Reset Notification Setup",
      "This will reset the notification preferences and show the setup modal again when you restart the app. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              // Reset notification preferences to show setup modal again
              await AsyncStorage.setItem(
                "@notification_preferences",
                JSON.stringify({
                  isEnabled: false,
                  hasAskedPermission: false,
                  prayers: {
                    fajr: { beginTime: false, jamahTime: false, jamahReminderMinutes: 10 },
                    zuhr: { beginTime: false, jamahTime: false, jamahReminderMinutes: 10 },
                    asr: { beginTime: false, jamahTime: false, jamahReminderMinutes: 10 },
                    maghrib: { beginTime: false, jamahTime: false, jamahReminderMinutes: 10 },
                    isha: { beginTime: false, jamahTime: false, jamahReminderMinutes: 10 },
                  },
                })
              );
              Alert.alert(
                "Success",
                "Notification setup has been reset. The setup modal will appear when you restart the app.",
                [{ text: "OK" }]
              );
            } catch (error) {
              console.error("Error resetting notification setup:", error);
              Alert.alert("Error", "Failed to reset notification setup.");
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            // After logout, the auth guard will redirect to login
          } catch (error) {
            Alert.alert("Error", "Failed to sign out.");
          }
        },
      },
    ]);
  };

  const handleDownloadYearlyCSV = async () => {
    try {
      const prayerTimes = await loadPrayerTimes();
      if (!prayerTimes || prayerTimes.length === 0) {
        Alert.alert("No Data", "No prayer times data available to download.");
        return;
      }

      const csvContent = generateCSVContent(prayerTimes);
      const fileName = `prayer_times_yearly_${new Date().getFullYear()}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Download Yearly Prayer Times CSV",
        });
      } else {
        Alert.alert("Success", "File saved to: " + fileUri);
      }
    } catch (error) {
      console.error("Error downloading yearly CSV:", error);
      Alert.alert("Error", "Failed to download yearly CSV file.");
    }
  };

  const handleDownloadMonthlyCSV = async () => {
    try {
      const prayerTimes = await loadPrayerTimes();
      if (!prayerTimes || prayerTimes.length === 0) {
        Alert.alert("No Data", "No prayer times data available to download.");
        return;
      }

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-based
      const currentYear = currentDate.getFullYear();

      const csvContent = generateMonthlyCSVContent(prayerTimes, currentYear, currentMonth);
      
      if (!csvContent) {
        Alert.alert("No Data", `No prayer times data available for ${getMonthName(currentMonth - 1)} ${currentYear}.`);
        return;
      }

      const fileName = `prayer_times_${getMonthName(currentMonth - 1)}_${currentYear}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: `Download ${getMonthName(currentMonth - 1)} Prayer Times CSV`,
        });
      } else {
        Alert.alert("Success", "File saved to: " + fileUri);
      }
    } catch (error) {
      console.error("Error downloading monthly CSV:", error);
      Alert.alert("Error", "Failed to download monthly CSV file.");
    }
  };

  const handleDevLoginAsAdmin = async () => {
    if (!__DEV__) return;

    try {
      await devLogin();
      Alert.alert("Success", "Logged in as dev admin!");
    } catch (error) {
      Alert.alert("Error", "Failed to login as dev admin.");
    }
  };

  // Show loading while redirecting
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        />
        <View style={styles.loadingContainer}>
          <ThemedText style={[styles.loadingText, { color: colors.text }]}>
            Checking authentication...
          </ThemedText>
        </View>
      </View>
    );
  }

  // Development mode: Show dev bypass if not authenticated
  if (__DEV__ && !isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        />
        
        {/* iOS-style Header */}
        <BlurView
          intensity={85}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Admin Access Required
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.text + "80" }]}>
              Sign in to access administrative features
            </Text>
          </View>
        </BlurView>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.accessDeniedContainer, { opacity: fadeAnim }]}>
            {/* Dev Mode Badge */}
            <View style={styles.devBadgeContainer}>
              <View style={[styles.devBadge, { backgroundColor: "#FF9800" }]}>
                <Text style={styles.devBadgeText}>🔧 Development Mode</Text>
              </View>
            </View>

            {/* Access Icon */}
            <View style={[styles.accessIconContainer, { backgroundColor: colors.primary + "15" }]}>
              <IconSymbol name="person.badge.key" size={64} color={colors.primary} />
            </View>

            <Text style={[styles.accessTitle, { color: colors.text }]}>
              Authentication Required
            </Text>
            
            <Text style={[styles.accessDescription, { color: colors.text + "60" }]}>
              You need admin privileges to access this section. In development mode, you can bypass authentication or use the login screen.
            </Text>

            {/* Action Cards */}
            <View style={styles.actionCards}>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colorScheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}
                onPress={handleDevLoginAsAdmin}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: "#FF9800" + "20" }]}>
                  <IconSymbol name="hammer" size={24} color="#FF9800" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>
                    Grant Admin Access
                  </Text>
                  <Text style={[styles.actionSubtitle, { color: colors.text + "60" }]}>
                    Development bypass
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.text + "40"} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colorScheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}
                onPress={() => router.push("/auth/login")}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: colors.primary + "15" }]}>
                  <IconSymbol name="person" size={24} color={colors.primary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>
                    Sign In
                  </Text>
                  <Text style={[styles.actionSubtitle, { color: colors.text + "60" }]}>
                    Use admin credentials
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.text + "40"} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.devNote, { color: colors.text + "40" }]}>
              Development options • Not available in production
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // Main admin interface (only shown if authenticated)
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
              Admin Panel
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: colors.text + "80" }]}
            >
              Manage prayer times and app settings
            </Text>
            {__DEV__ && (
              <View style={styles.headerBadge}>
                <View style={[styles.devModeBadge, { backgroundColor: "#FF9800" }]}>
                  <Text style={styles.devModeBadgeText}>DEV MODE</Text>
                </View>
              </View>
            )}
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
          {/* User Info Card */}
          <BlurView
            intensity={60}
            tint={colorScheme === "dark" ? "dark" : "light"}
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.surface + "95",
                borderColor:
                  colorScheme === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
              },
            ]}
          >
            <View style={styles.userHeader}>
              <View
                style={[
                  styles.userAvatar,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <IconSymbol name="person.fill" size={28} color={colors.primary} />
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {user?.name || "Admin"}
                </Text>
                <Text style={[styles.userEmail, { color: colors.text + "60" }]}>
                  {user?.email || "admin@masjidabubakr.org.uk"}
                </Text>
              </View>
            </View>

            {/* Status Items */}
            <View style={styles.statusItems}>
              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, { color: colors.text + "60" }]}>Role</Text>
                <Text style={[styles.statusValue, { color: colors.text }]}>Administrator</Text>
              </View>
              <View
                style={[
                  styles.statusDivider,
                  { backgroundColor: colors.text + "10" },
                ]}
              />
              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, { color: colors.text + "60" }]}>Last Update</Text>
                <Text style={[styles.statusValue, { color: colors.text }]}>
                  {lastUpdate ? new Date(lastUpdate).toLocaleDateString() : "Never"}
                </Text>
              </View>
              <View
                style={[
                  styles.statusDivider,
                  { backgroundColor: colors.text + "10" },
                ]}
              />
              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, { color: colors.text + "60" }]}>Environment</Text>
                <Text style={[styles.statusValue, { color: colors.text }]}>
                  {__DEV__ ? "Development" : "Production"}
                </Text>
              </View>
            </View>
          </BlurView>

          {/* Prayer Times Management Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text + "60" }]}>
              PRAYER TIMES MANAGEMENT
            </Text>

            <BlurView
              intensity={60}
              tint={colorScheme === "dark" ? "dark" : "light"}
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.surface + "95",
                  borderColor:
                    colorScheme === "dark"
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                },
              ]}
            >
              {/* Monthly Upload Card */}
              <View style={[styles.uploadCard, { borderBottomColor: colors.text + "10" }]}>
                <View style={styles.uploadHeader}>
                  <View style={[styles.uploadIconContainer, { backgroundColor: colors.primary + "15" }]}>
                    <IconSymbol name="calendar" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.uploadInfo}>
                    <View style={styles.uploadTitleRow}>
                      <Text style={[styles.uploadTitle, { color: colors.text }]}>
                        Monthly Upload
                      </Text>
                      <View style={[styles.recommendedBadge, { backgroundColor: colors.primary + "20" }]}>
                        <Text style={[styles.recommendedText, { color: colors.primary }]}>
                          RECOMMENDED
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.uploadDescription, { color: colors.text + "60" }]}>
                      Upload prayer times for a specific month
                    </Text>
                  </View>
                </View>
                <CSVUploader onUploadComplete={loadLastUpdate} />
              </View>

              {/* Yearly Upload Card */}
              <View style={styles.uploadCard}>
                <View style={styles.uploadHeader}>
                  <View style={[styles.uploadIconContainer, { backgroundColor: "#FF9800" + "15" }]}>
                    <IconSymbol name="calendar" size={24} color="#FF9800" />
                  </View>
                  <View style={styles.uploadInfo}>
                    <View style={styles.uploadTitleRow}>
                      <Text style={[styles.uploadTitle, { color: colors.text }]}>
                        Yearly Upload
                      </Text>
                      <View style={[styles.warningBadge, { backgroundColor: "#FF9800" + "20" }]}>
                        <Text style={[styles.warningText, { color: "#FF9800" }]}>
                          ADVANCED
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.uploadDescription, { color: colors.text + "60" }]}>
                      Replace ALL existing prayer times with yearly data
                    </Text>
                  </View>
                </View>
                <YearlyCSVUploader onUploadComplete={loadLastUpdate} />
              </View>
            </BlurView>
          </View>

          {/* Quick Update Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text + "60" }]}>
              QUICK UPDATE
            </Text>

            <BlurView
              intensity={60}
              tint={colorScheme === "dark" ? "dark" : "light"}
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.surface + "95",
                  borderColor:
                    colorScheme === "dark"
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                },
              ]}
            >
              <View style={styles.quickUpdateContainer}>
                <View style={styles.quickUpdateHeader}>
                  <View style={[styles.quickUpdateIconContainer, { backgroundColor: colors.primary + "15" }]}>
                    <IconSymbol name="bolt" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.quickUpdateInfo}>
                    <View style={styles.quickUpdateTitleRow}>
                      <Text style={[styles.quickUpdateTitle, { color: colors.text }]}>
                        Quick Time Adjustment
                      </Text>
                      <View style={[styles.instantBadge, { backgroundColor: colors.primary + "20" }]}>
                        <Text style={[styles.instantText, { color: colors.primary }]}>
                          INSTANT
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.quickUpdateDescription, { color: colors.text + "60" }]}>
                      Update prayer times for any date directly
                    </Text>
                  </View>
                </View>
                <QuickUpdate onUploadComplete={loadLastUpdate} />
              </View>
            </BlurView>
          </View>

          {/* Download Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text + "60" }]}>
              DOWNLOAD DATA
            </Text>

            <BlurView
              intensity={60}
              tint={colorScheme === "dark" ? "dark" : "light"}
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.surface + "95",
                  borderColor:
                    colorScheme === "dark"
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                },
              ]}
            >
              {/* Download Current Month CSV */}
              <TouchableOpacity
                style={[styles.actionRow, { borderBottomColor: colors.text + "10" }]}
                onPress={handleDownloadMonthlyCSV}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.primary + "15" }]}>
                  <IconSymbol name="square.and.arrow.down" size={20} color={colors.primary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>
                    Download Current Month CSV
                  </Text>
                  <Text style={[styles.actionSubtitle, { color: colors.text + "60" }]}>
                    Export {getMonthName(new Date().getMonth())} {new Date().getFullYear()} prayer times
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.text + "40"} />
              </TouchableOpacity>

              {/* Download Yearly CSV */}
              <TouchableOpacity
                style={styles.actionRow}
                onPress={handleDownloadYearlyCSV}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.primary + "15" }]}>
                  <IconSymbol name="doc.on.doc" size={20} color={colors.primary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>
                    Download Full Year CSV
                  </Text>
                  <Text style={[styles.actionSubtitle, { color: colors.text + "60" }]}>
                    Export all available prayer times data
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.text + "40"} />
              </TouchableOpacity>
            </BlurView>
          </View>

          {/* Actions Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text + "60" }]}>
              ACTIONS
            </Text>

            <BlurView
              intensity={60}
              tint={colorScheme === "dark" ? "dark" : "light"}
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.surface + "95",
                  borderColor:
                    colorScheme === "dark"
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                },
              ]}
            >
              {/* Clear Data Button */}
              <TouchableOpacity
                style={[styles.actionRow, { borderBottomColor: colors.text + "10" }]}
                onPress={handleClearData}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.error + "15" }]}>
                  <IconSymbol name="trash" size={20} color={colors.error} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: colors.error }]}>
                    Clear All Data
                  </Text>
                  <Text style={[styles.actionSubtitle, { color: colors.text + "60" }]}>
                    Delete all prayer times and user data
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.text + "40"} />
              </TouchableOpacity>

              {/* Reset Notification Setup Button */}
              <TouchableOpacity
                style={[styles.actionRow, { borderBottomColor: colors.text + "10" }]}
                onPress={handleResetNotificationSetup}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.primary + "15" }]}>
                  <IconSymbol name="bell.slash" size={20} color={colors.primary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>
                    Reset Notification Setup
                  </Text>
                  <Text style={[styles.actionSubtitle, { color: colors.text + "60" }]}>
                    Show notification setup modal again
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.text + "40"} />
              </TouchableOpacity>

              {/* Sign Out Button */}
              <TouchableOpacity
                style={styles.actionRow}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.text + "10" }]}>
                  <IconSymbol name="arrow.right.square" size={20} color={colors.text + "60"} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>
                    Sign Out
                  </Text>
                  <Text style={[styles.actionSubtitle, { color: colors.text + "60" }]}>
                    Exit admin panel
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.text + "40"} />
              </TouchableOpacity>
            </BlurView>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.4,
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
  headerBadge: {
    marginTop: 8,
  },
  devModeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  devModeBadgeText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Scroll view
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
  },

  // Access Denied View
  accessDeniedContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  devBadgeContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  devBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  devBadgeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  accessIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  accessTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.37,
    textAlign: "center",
    marginBottom: 12,
  },
  accessDescription: {
    fontSize: 17,
    letterSpacing: -0.4,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  actionCards: {
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
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
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    letterSpacing: -0.08,
  },
  devNote: {
    fontSize: 13,
    letterSpacing: -0.08,
    textAlign: "center",
    fontStyle: "italic",
  },

  // User Info Card
  infoCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  statusItems: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusItem: {
    flex: 1,
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 12,
    letterSpacing: -0.08,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  statusDivider: {
    width: 1,
    height: 32,
    opacity: 0.5,
  },

  // Sections
  section: {
    marginBottom: 35,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.08,
    textTransform: "uppercase",
    marginLeft: 32,
    marginBottom: 8,
  },
  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },

  // Upload Cards
  uploadCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  uploadHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  uploadIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadInfo: {
    flex: 1,
  },
  uploadTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  uploadTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  uploadDescription: {
    fontSize: 13,
    letterSpacing: -0.08,
  },
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  warningBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  warningText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Action Rows
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 60,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  bottomSpacing: {
    height: Platform.OS === "ios" ? 100 : 80,
  },

  // Quick Update Styles
  quickUpdateContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  quickUpdateHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  quickUpdateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  quickUpdateInfo: {
    flex: 1,
  },
  quickUpdateTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  quickUpdateTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  quickUpdateDescription: {
    fontSize: 13,
    letterSpacing: -0.08,
  },
  instantBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  instantText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
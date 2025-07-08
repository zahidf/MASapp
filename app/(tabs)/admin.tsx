import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Animated,
  Modal,
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
import { QuickUpdate } from "@/components/admin/QuickUpdateExpo";
import { YearlyCSVUploader } from "@/components/admin/YearlyCSVUploader";
import { DebugLogViewer } from "@/components/debug/DebugLogViewer";
import { FirebaseDebugDashboard } from "@/components/debug/FirebaseDebugDashboard";
import { QiblaCalibrationModal } from "@/components/qibla/QiblaCalibrationModal";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { useColorScheme } from "@/hooks/useColorScheme";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { generateCSVContent, generateMonthlyCSVContent } from "@/utils/csvParser";
import { getMonthName } from "@/utils/dateHelpers";
import { debugLogger } from "@/utils/debugLogger";
import { clearAllData, getLastUpdateTime, loadPrayerTimes } from "@/utils/storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

// Custom hook for admin authentication guard
function useAdminAuthGuard() {
  const { user, config } = useAuth();
  const isDev = config.isDevelopment;
  const [isChecking, setIsChecking] = React.useState(true);

  React.useEffect(() => {
    // Add a small delay to ensure auth state is loaded
    const checkAuth = async () => {
      setIsChecking(true);
      
      // Wait a bit for auth state to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Always redirect to login if not admin (regardless of environment)
      if (!user?.isAdmin) {
        router.replace("/auth/login");
      }
      
      setIsChecking(false);
    };
    
    checkAuth();
  }, [user]);

  return {
    isAuthenticated: !!user?.isAdmin,
    isLoading: isChecking,
    user,
  };
}

export default function AdminScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { logout, config } = useAuth();
  const { refreshData } = usePrayerTimes();
  const [lastUpdate, setLastUpdate] = React.useState<string | null>(null);
  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [headerAnim] = React.useState(new Animated.Value(0));
  const [debugModalVisible, setDebugModalVisible] = React.useState(false);
  const [debugViewerVisible, setDebugViewerVisible] = React.useState(false);
  const [showQiblaCalibrationModal, setShowQiblaCalibrationModal] = React.useState(false);
  const { showSetupModal } = useNotificationContext();
  const isDev = config.isDevelopment;

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
            // Navigate to the home tab after logout
            router.replace("/");
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

  // Main admin interface (only shown if authenticated)
  return (
    <View style={[styles.container, { backgroundColor: colors.systemGroupedBackground }]}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      {/* iOS-style Navigation Bar with Liquid Glass */}
      <Animated.View
        style={[
          styles.navigationBarWrapper,
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
          intensity={Platform.OS === "ios" ? 98 : 85}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={styles.navigationBar}
        >
          <View style={styles.navigationContent}>
            <Text style={[styles.navigationTitle, { color: colors.text }]}>
              Admin Panel
            </Text>
          </View>
        </BlurView>
        
        {/* Soft edge effect */}
        <View 
          style={[
            styles.navigationEdge, 
            { backgroundColor: colorScheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }
          ]} 
        />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.groupedScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* User Info Section */}
          <View style={styles.sectionContainer}>
            <View
              style={[
                styles.groupedSection,
                { backgroundColor: colors.secondarySystemGroupedBackground }
              ]}
            >
              <View style={styles.userInfoRow}>
                <View style={[styles.userAvatar, { backgroundColor: colors.systemGray5 }]}>
                  <IconSymbol name="person.fill" size={24} color={colors.systemGray} />
                </View>
                <View style={styles.userTextInfo}>
                  <Text style={[styles.userName, { color: colors.text }]}>
                    {user?.name || "Administrator"}
                  </Text>
                  <Text style={[styles.userRole, { color: colors.secondaryText }]}>
                    {user?.email || "admin@masjidabubakr.org.uk"}
                  </Text>
                </View>
              </View>
              
              <View style={[styles.separator, { backgroundColor: colors.separator }]} />
              
              <View style={styles.userStats}>
                <View style={styles.userStatItem}>
                  <Text style={[styles.userStatLabel, { color: colors.secondaryText }]}>
                    Last Update
                  </Text>
                  <Text style={[styles.userStatValue, { color: colors.text }]}>
                    {lastUpdate ? new Date(lastUpdate).toLocaleDateString() : "Never"}
                  </Text>
                </View>
                <View style={[styles.userStatDivider, { backgroundColor: colors.separator }]} />
                <View style={styles.userStatItem}>
                  <Text style={[styles.userStatLabel, { color: colors.secondaryText }]}>
                    Environment
                  </Text>
                  <Text style={[styles.userStatValue, { color: colors.text }]}>
                    {isDev ? "Development" : "Production"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Prayer Times Management Section */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionHeader, { color: colors.secondaryText }]}>
              PRAYER TIMES MANAGEMENT
            </Text>
            
            <View style={[styles.groupedSection, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
              {/* Monthly Upload */}
              <View style={styles.listItem}>
                <View style={styles.listItemContent}>
                  <View style={[styles.listIcon, { backgroundColor: colors.tint + "15" }]}>
                    <IconSymbol name="calendar" size={22} color={colors.tint} />
                  </View>
                  <View style={styles.listItemText}>
                    <Text style={[styles.listItemTitle, { color: colors.text }]}>
                      Monthly Upload
                    </Text>
                    <Text style={[styles.listItemSubtitle, { color: colors.secondaryText }]}>
                      Upload prayer times for a specific month
                    </Text>
                  </View>
                </View>
                <CSVUploader onUploadComplete={loadLastUpdate} />
              </View>

              <View style={[styles.separator, { backgroundColor: colors.separator }]} />

              {/* Yearly Upload */}
              <View style={styles.listItem}>
                <View style={styles.listItemContent}>
                  <View style={[styles.listIcon, { backgroundColor: colors.systemOrange + "15" }]}>
                    <IconSymbol name="calendar.badge.exclamationmark" size={22} color={colors.systemOrange} />
                  </View>
                  <View style={styles.listItemText}>
                    <Text style={[styles.listItemTitle, { color: colors.text }]}>
                      Yearly Upload
                    </Text>
                    <Text style={[styles.listItemSubtitle, { color: colors.secondaryText }]}>
                      Replace all existing prayer times
                    </Text>
                  </View>
                </View>
                <YearlyCSVUploader onUploadComplete={loadLastUpdate} />
              </View>
            </View>
          </View>

          {/* Quick Update Section */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionHeader, { color: colors.secondaryText }]}>
              QUICK UPDATE
            </Text>
            
            <View style={[styles.groupedSection, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
              <View style={styles.quickUpdateSection}>
                <View style={styles.listItemContent}>
                  <View style={[styles.listIcon, { backgroundColor: colors.tint + "15" }]}>
                    <IconSymbol name="clock.badge.checkmark" size={22} color={colors.tint} />
                  </View>
                  <View style={styles.listItemText}>
                    <Text style={[styles.listItemTitle, { color: colors.text }]}>
                      Time Adjustment
                    </Text>
                    <Text style={[styles.listItemSubtitle, { color: colors.secondaryText }]}>
                      Update prayer times for any date
                    </Text>
                  </View>
                </View>
                <QuickUpdate onUpdateComplete={loadLastUpdate} />
              </View>
            </View>
          </View>

          {/* Download Section */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionHeader, { color: colors.secondaryText }]}>
              EXPORT DATA
            </Text>
            
            <View style={[styles.groupedSection, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
              <TouchableOpacity
                style={styles.listButton}
                onPress={handleDownloadMonthlyCSV}
                activeOpacity={0.7}
              >
                <View style={[styles.listIcon, { backgroundColor: colors.systemBlue + "15" }]}>
                  <IconSymbol name="square.and.arrow.down" size={22} color={colors.systemBlue} />
                </View>
                <View style={styles.listItemText}>
                  <Text style={[styles.listItemTitle, { color: colors.text }]}>
                    Export Current Month
                  </Text>
                  <Text style={[styles.listItemSubtitle, { color: colors.secondaryText }]}>
                    Download {getMonthName(new Date().getMonth())} {new Date().getFullYear()}
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.tertiaryText} />
              </TouchableOpacity>

              <View style={[styles.separator, { backgroundColor: colors.separator }]} />

              <TouchableOpacity
                style={styles.listButton}
                onPress={handleDownloadYearlyCSV}
                activeOpacity={0.7}
              >
                <View style={[styles.listIcon, { backgroundColor: colors.systemBlue + "15" }]}>
                  <IconSymbol name="doc.on.doc" size={22} color={colors.systemBlue} />
                </View>
                <View style={styles.listItemText}>
                  <Text style={[styles.listItemTitle, { color: colors.text }]}>
                    Export Full Year
                  </Text>
                  <Text style={[styles.listItemSubtitle, { color: colors.secondaryText }]}>
                    Download all available data
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.tertiaryText} />
              </TouchableOpacity>
            </View>
          </View>


          {/* System Actions Section */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionHeader, { color: colors.secondaryText }]}>
              SYSTEM
            </Text>
            
            <View style={[styles.groupedSection, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
              <TouchableOpacity
                style={styles.listButton}
                onPress={handleResetNotificationSetup}
                activeOpacity={0.7}
              >
                <View style={[styles.listIcon, { backgroundColor: colors.tint + "15" }]}>
                  <IconSymbol name="bell.slash" size={22} color={colors.tint} />
                </View>
                <View style={styles.listItemText}>
                  <Text style={[styles.listItemTitle, { color: colors.text }]}>
                    Reset Notifications
                  </Text>
                  <Text style={[styles.listItemSubtitle, { color: colors.secondaryText }]}>
                    Show setup modal on next launch
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.tertiaryText} />
              </TouchableOpacity>

              <View style={[styles.separator, { backgroundColor: colors.separator }]} />

              <TouchableOpacity
                style={styles.listButton}
                onPress={() => showSetupModal()}
                activeOpacity={0.7}
              >
                <View style={[styles.listIcon, { backgroundColor: colors.tint + "15" }]}>
                  <IconSymbol name="bell.badge" size={22} color={colors.tint} />
                </View>
                <View style={styles.listItemText}>
                  <Text style={[styles.listItemTitle, { color: colors.text }]}>
                    Test Notification Setup
                  </Text>
                  <Text style={[styles.listItemSubtitle, { color: colors.secondaryText }]}>
                    Preview the setup modal
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.tertiaryText} />
              </TouchableOpacity>

              <View style={[styles.separator, { backgroundColor: colors.separator }]} />

              <TouchableOpacity
                style={styles.listButton}
                onPress={() => setShowQiblaCalibrationModal(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.listIcon, { backgroundColor: colors.tint + "15" }]}>
                  <IconSymbol name="location.fill" size={22} color={colors.tint} />
                </View>
                <View style={styles.listItemText}>
                  <Text style={[styles.listItemTitle, { color: colors.text }]}>
                    Test Qibla Calibration
                  </Text>
                  <Text style={[styles.listItemSubtitle, { color: colors.secondaryText }]}>
                    Preview the calibration modal
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.tertiaryText} />
              </TouchableOpacity>

              <View style={[styles.separator, { backgroundColor: colors.separator }]} />

              <TouchableOpacity
                style={styles.listButton}
                onPress={handleClearData}
                activeOpacity={0.7}
              >
                <View style={[styles.listIcon, { backgroundColor: colors.systemRed + "15" }]}>
                  <IconSymbol name="trash" size={22} color={colors.systemRed} />
                </View>
                <View style={styles.listItemText}>
                  <Text style={[styles.listItemTitle, { color: colors.systemRed }]}>
                    Clear All Data
                  </Text>
                  <Text style={[styles.listItemSubtitle, { color: colors.secondaryText }]}>
                    Delete all prayer times and settings
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.tertiaryText} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Out Section */}
          <View style={styles.sectionContainer}>
            <View style={[styles.groupedSection, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
              <TouchableOpacity
                style={[styles.listButton, { justifyContent: "center" }]}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Text style={[styles.signOutText, { color: colors.systemRed }]}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </Animated.View>
      </ScrollView>

      {/* Debug Modal */}
      <Modal
        visible={debugModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDebugModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.systemGroupedBackground }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Firebase Dashboard</Text>
            <TouchableOpacity
              onPress={() => setDebugModalVisible(false)}
              style={[styles.modalCloseButton, { backgroundColor: colors.systemGray5 }]}
            >
              <IconSymbol name="xmark" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FirebaseDebugDashboard />
        </View>
      </Modal>

      {/* Debug Log Viewer Modal */}
      <DebugLogViewer
        visible={debugViewerVisible}
        onClose={() => setDebugViewerVisible(false)}
      />

      {/* Qibla Calibration Modal */}
      <QiblaCalibrationModal
        showCalibrationModal={showQiblaCalibrationModal}
        setShowCalibrationModal={setShowQiblaCalibrationModal}
        colors={colors}
        colorScheme={colorScheme}
      />
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
    fontSize: 17,
    fontWeight: "400",
    letterSpacing: -0.4,
  },

  // iOS Navigation Bar (Liquid Glass)
  navigationBarWrapper: {
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0.5 },
        shadowOpacity: 0.1,
        shadowRadius: 0,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  navigationBar: {
    paddingTop: Platform.OS === "ios" ? 60 : StatusBar.currentHeight || 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  navigationContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  navigationTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  navigationEdge: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.3,
  },
  devModeBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  devModeBadgeText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.06,
  },

  // Scroll view
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
  },
  groupedScrollContent: {
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
  },

  // Access Denied View
  accessDeniedContainer: {
    paddingHorizontal: 20,
    paddingTop: 60,
    alignItems: "center",
  },
  devBadgeContainer: {
    marginBottom: 32,
  },
  devBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  devBadgeText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "600",
    letterSpacing: -0.08,
  },
  accessIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  accessTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.35,
    marginBottom: 12,
    textAlign: "center",
  },
  accessDescription: {
    fontSize: 17,
    letterSpacing: -0.4,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 44,
    paddingHorizontal: 32,
  },
  actionButtons: {
    gap: 12,
    width: "100%",
    maxWidth: 320,
  },
  primaryButton: {
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  secondaryButton: {
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },

  // Sections
  sectionContainer: {
    marginBottom: 35,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "400",
    letterSpacing: -0.08,
    marginLeft: 20,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  groupedSection: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
  },

  // User Info
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  userTextInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  userStats: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userStatItem: {
    flex: 1,
    alignItems: "center",
  },
  userStatLabel: {
    fontSize: 13,
    letterSpacing: -0.08,
    marginBottom: 4,
  },
  userStatValue: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  userStatDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    marginHorizontal: 16,
  },

  // List Items
  listItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  listButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  listItemContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  listItemText: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 17,
    fontWeight: "400",
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  listItemSubtitle: {
    fontSize: 15,
    letterSpacing: -0.2,
  },

  // Separator
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 64,
  },

  // Quick Update
  quickUpdateSection: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  // Sign Out
  signOutText: {
    fontSize: 17,
    fontWeight: "400",
    letterSpacing: -0.4,
    textAlign: "center",
  },

  // Bottom spacing
  bottomSpacing: {
    height: 20,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: Platform.OS === "ios" ? 60 : 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
});
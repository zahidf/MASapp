import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Animated,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { CSVUploader } from "@/components/admin/CSVUploader";
import { YearlyCSVUploader } from "@/components/admin/YearlyCSVUploader";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { useColorScheme } from "@/hooks/useColorScheme";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { clearAllData, getLastUpdateTime } from "@/utils/storage";

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
  const { preferences } = useNotificationContext();
  const [lastUpdate, setLastUpdate] = React.useState<string | null>(null);
  const [fadeAnim] = React.useState(new Animated.Value(0));

  // Use auth guard
  const { isAuthenticated, isLoading, user } = useAdminAuthGuard();

  React.useEffect(() => {
    if (isAuthenticated) {
      loadLastUpdate();

      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
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

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "default",
        onPress: async () => {
          try {
            await logout();
            // After logout, the auth guard will redirect to login
          } catch (error) {
            Alert.alert("Error", "Failed to logout.");
          }
        },
      },
    ]);
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
        <Animated.View
          style={[styles.accessDeniedContainer, { opacity: fadeAnim }]}
        >
          <View style={[styles.devBadgeHeader, { backgroundColor: "#FF9800" }]}>
            <ThemedText style={styles.devModeText}>
              🔧 Development Mode
            </ThemedText>
          </View>

          <View
            style={[
              styles.accessDeniedIcon,
              { backgroundColor: `${colors.primary}20` },
            ]}
          >
            <IconSymbol
              name="person.badge.key"
              size={80}
              color={colors.primary}
            />
          </View>

          <ThemedText
            type="title"
            style={[styles.accessDeniedTitle, { color: colors.text }]}
          >
            Admin Access Required
          </ThemedText>

          <ThemedText
            style={[styles.accessDeniedText, { color: `${colors.text}B3` }]}
          >
            You need admin privileges to access the admin panel. In development
            mode, you can bypass this restriction or use the login screen.
          </ThemedText>

          <View style={styles.devBypass}>
            <TouchableOpacity
              style={styles.devBypassButton}
              onPress={handleDevLoginAsAdmin}
            >
              <IconSymbol name="hammer" size={24} color="#fff" />
              <ThemedText style={styles.devBypassText}>
                Grant Admin Access (Dev)
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/auth/login")}
            >
              <IconSymbol name="person" size={24} color="#fff" />
              <ThemedText style={styles.devBypassText}>
                Go to Login Screen
              </ThemedText>
            </TouchableOpacity>

            <ThemedText
              style={[styles.devBypassNote, { color: `${colors.text}B3` }]}
            >
              🔧 Development options - not available in production
            </ThemedText>
          </View>
        </Animated.View>
      </View>
    );
  }

  // Main admin interface (only shown if authenticated)
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Enhanced Header */}
          <View style={[styles.header, { backgroundColor: colors.primary }]}>
            <View style={styles.titleRow}>
              <View style={styles.adminIcon}>
                <IconSymbol name="gear.circle.fill" size={32} color="#fff" />
              </View>
              <View style={styles.titleContent}>
                <ThemedText type="title" style={styles.title}>
                  Admin Panel
                </ThemedText>
                {__DEV__ && (
                  <View style={styles.devBadge}>
                    <ThemedText style={styles.devBadgeText}>
                      DEV MODE
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
            <ThemedText style={styles.subtitle}>
              Welcome back, {user?.name || "Admin"}
              {user?.id?.includes("dev") && " (Development)"}
            </ThemedText>
          </View>

          {/* System Status Card */}
          <ThemedView
            style={[styles.statusCard, { backgroundColor: colors.surface }]}
          >
            <View style={styles.statusHeader}>
              <IconSymbol
                name="checkmark.circle"
                size={24}
                color={colors.primary}
              />
              <ThemedText
                type="subtitle"
                style={[styles.statusTitle, { color: colors.text }]}
              >
                System Status
              </ThemedText>
            </View>

            {lastUpdate && (
              <View style={styles.statusRow}>
                <ThemedText
                  style={[styles.statusLabel, { color: `${colors.text}B3` }]}
                >
                  Last Updated
                </ThemedText>
                <ThemedText
                  style={[styles.statusValue, { color: colors.text }]}
                >
                  {new Date(lastUpdate).toLocaleString()}
                </ThemedText>
              </View>
            )}

            <View style={styles.statusRow}>
              <ThemedText
                style={[styles.statusLabel, { color: `${colors.text}B3` }]}
              >
                User Role
              </ThemedText>
              <ThemedText style={[styles.statusValue, { color: colors.text }]}>
                {user?.isAdmin ? "Administrator" : "User"}
              </ThemedText>
            </View>

            <View style={styles.statusRow}>
              <ThemedText
                style={[styles.statusLabel, { color: `${colors.text}B3` }]}
              >
                Environment
              </ThemedText>
              <ThemedText style={[styles.statusValue, { color: colors.text }]}>
                {__DEV__ ? "Development" : "Production"}
              </ThemedText>
            </View>
          </ThemedView>

          {/* Prayer Times Management */}
          <ThemedView
            style={[styles.section, { backgroundColor: colors.surface }]}
          >
            <View style={styles.sectionHeader}>
              <IconSymbol name="calendar" size={24} color={colors.primary} />
              <ThemedText
                type="subtitle"
                style={[styles.sectionTitle, { color: colors.text }]}
              >
                Prayer Times Management
              </ThemedText>
            </View>

            <View style={styles.uploaderTabs}>
              <ThemedText style={[styles.tabsTitle, { color: colors.primary }]}>
                Upload Options
              </ThemedText>

              <View
                style={[
                  styles.uploaderContainer,
                  {
                    backgroundColor:
                      colorScheme === "dark" ? "#333333" : "#f8f9fa",
                    borderColor: colorScheme === "dark" ? "#404040" : "#e9ecef",
                  },
                ]}
              >
                <View style={styles.uploaderHeader}>
                  <ThemedText
                    style={[styles.uploaderTitle, { color: colors.text }]}
                  >
                    📅 Monthly Upload
                  </ThemedText>
                  <View style={styles.uploaderBadge}>
                    <ThemedText style={styles.uploaderBadgeText}>
                      RECOMMENDED
                    </ThemedText>
                  </View>
                </View>
                <ThemedText
                  style={[
                    styles.uploaderDescription,
                    { color: `${colors.text}B3` },
                  ]}
                >
                  Upload prayer times for a specific month. This will merge with
                  existing data.
                </ThemedText>
                <CSVUploader onUploadComplete={loadLastUpdate} />
              </View>

              <View
                style={[
                  styles.uploaderContainer,
                  {
                    backgroundColor:
                      colorScheme === "dark" ? "#333333" : "#f8f9fa",
                    borderColor: colorScheme === "dark" ? "#404040" : "#e9ecef",
                  },
                ]}
              >
                <View style={styles.uploaderHeader}>
                  <ThemedText
                    style={[styles.uploaderTitle, { color: colors.text }]}
                  >
                    📆 Yearly Upload
                  </ThemedText>
                  <View style={[styles.uploaderBadge, styles.warningBadge]}>
                    <ThemedText style={styles.uploaderBadgeText}>
                      ADVANCED
                    </ThemedText>
                  </View>
                </View>
                <ThemedText
                  style={[
                    styles.uploaderDescription,
                    { color: `${colors.text}B3` },
                  ]}
                >
                  Upload complete year data. This will replace ALL existing
                  prayer times.
                </ThemedText>
                <YearlyCSVUploader onUploadComplete={loadLastUpdate} />
              </View>
            </View>
          </ThemedView>

          {/* Data Management */}
          <ThemedView
            style={[styles.section, { backgroundColor: colors.surface }]}
          >
            <View style={styles.sectionHeader}>
              <IconSymbol name="gear" size={24} color={colors.primary} />
              <ThemedText
                type="subtitle"
                style={[styles.sectionTitle, { color: colors.text }]}
              >
                Data Management
              </ThemedText>
            </View>

            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleClearData}
            >
              <IconSymbol name="trash" size={20} color="#fff" />
              <ThemedText style={styles.buttonText}>Clear All Data</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {/* Account Management */}
          <ThemedView
            style={[styles.section, { backgroundColor: colors.surface }]}
          >
            <View style={styles.sectionHeader}>
              <IconSymbol name="person" size={24} color={colors.primary} />
              <ThemedText
                type="subtitle"
                style={[styles.sectionTitle, { color: colors.text }]}
              >
                Account
              </ThemedText>
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <IconSymbol name="arrow.right.square" size={20} color="#fff" />
              <ThemedText style={styles.buttonText}>Logout</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// Styles remain the same as your original file
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop:
      Platform.OS === "ios" ? 60 : (StatusBar.currentHeight || 24) + 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  adminIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  titleContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "800",
  },
  devBadge: {
    backgroundColor: "#FF9800",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  devBadgeText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  statusCard: {
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  uploaderTabs: {
    gap: 24,
  },
  tabsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  uploaderContainer: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  uploaderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  uploaderTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  uploaderBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  warningBadge: {
    backgroundColor: "#FF9800",
  },
  uploaderBadgeText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "bold",
  },
  uploaderDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#d32f2f",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#d32f2f",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#666",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#666",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  devBadgeHeader: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : (StatusBar.currentHeight || 24) + 20,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingVertical: 8,
    marginHorizontal: 20,
    borderRadius: 8,
  },
  devModeText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  accessDeniedIcon: {
    marginBottom: 32,
    padding: 24,
    borderRadius: 32,
  },
  accessDeniedTitle: {
    fontSize: 24,
    marginBottom: 16,
    textAlign: "center",
    fontWeight: "800",
  },
  accessDeniedText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  devBypass: {
    marginTop: 40,
    alignItems: "center",
    width: "100%",
    gap: 16,
  },
  devBypassButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FF9800",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#FF9800",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  devBypassText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  devBypassNote: {
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: 16,
  },
  bottomSpacing: {
    height: Platform.OS === "ios" ? 100 : 80,
  },
});

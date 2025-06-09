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
import { useAuth } from "@/hooks/useAuth";
import { useColorScheme } from "@/hooks/useColorScheme";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { clearAllData, getLastUpdateTime } from "@/utils/storage";

const DEV_MODE = __DEV__;

export default function AdminScreen() {
  const colorScheme = useColorScheme();
  const { user, logout, devLogin } = useAuth();
  const { refreshData } = usePrayerTimes();
  const [lastUpdate, setLastUpdate] = React.useState<string | null>(null);
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    loadLastUpdate();

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

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
          } catch (error) {
            Alert.alert("Error", "Failed to logout.");
          }
        },
      },
    ]);
  };

  const handleDevLoginAsAdmin = async () => {
    if (!DEV_MODE) return;

    try {
      await devLogin();
      Alert.alert("Success", "Logged in as dev admin!");
    } catch (error) {
      Alert.alert("Error", "Failed to login as dev admin.");
    }
  };

  // Enhanced access denied screen for non-admin users
  if (!user?.isAdmin && !DEV_MODE) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        />
        <Animated.View
          style={[styles.accessDeniedContainer, { opacity: fadeAnim }]}
        >
          <View style={styles.accessDeniedIcon}>
            <IconSymbol
              name="shield"
              size={80}
              color={Colors[colorScheme ?? "light"].primary}
            />
          </View>
          <ThemedText type="title" style={styles.accessDeniedTitle}>
            Access Restricted
          </ThemedText>
          <ThemedText style={styles.accessDeniedText}>
            You need admin privileges to access this section. Please contact the
            mosque administration for access.
          </ThemedText>

          <View style={styles.accessDeniedActions}>
            <TouchableOpacity style={styles.backButton}>
              <IconSymbol name="arrow.left" size={20} color="#fff" />
              <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  // Show bypass option for non-admin users in development mode
  if (!user?.isAdmin && DEV_MODE) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        />
        <Animated.View
          style={[styles.accessDeniedContainer, { opacity: fadeAnim }]}
        >
          <View style={styles.devBadgeHeader}>
            <ThemedText style={styles.devModeText}>
              🔧 Development Mode
            </ThemedText>
          </View>

          <View style={styles.accessDeniedIcon}>
            <IconSymbol
              name="person.badge.key"
              size={80}
              color={Colors[colorScheme ?? "light"].primary}
            />
          </View>

          <ThemedText type="title" style={styles.accessDeniedTitle}>
            Admin Access Required
          </ThemedText>
          <ThemedText style={styles.accessDeniedText}>
            You need admin privileges to access the admin panel. In development
            mode, you can bypass this restriction.
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

            <ThemedText style={styles.devBypassNote}>
              🔧 This option is only available in development mode
            </ThemedText>
          </View>
        </Animated.View>
      </View>
    );
  }

  // Main admin interface for admin users
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Enhanced Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.adminIcon}>
                <IconSymbol name="gear.circle.fill" size={32} color="#fff" />
              </View>
              <View style={styles.titleContent}>
                <ThemedText type="title" style={styles.title}>
                  Admin Panel
                </ThemedText>
                {DEV_MODE && (
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
          <ThemedView style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <IconSymbol
                name="checkmark.circle"
                size={24}
                color={Colors[colorScheme ?? "light"].primary}
              />
              <ThemedText type="subtitle" style={styles.statusTitle}>
                System Status
              </ThemedText>
            </View>

            {lastUpdate && (
              <View style={styles.statusRow}>
                <ThemedText style={styles.statusLabel}>Last Updated</ThemedText>
                <ThemedText style={styles.statusValue}>
                  {new Date(lastUpdate).toLocaleString()}
                </ThemedText>
              </View>
            )}

            <View style={styles.statusRow}>
              <ThemedText style={styles.statusLabel}>User Role</ThemedText>
              <ThemedText style={styles.statusValue}>
                {user?.isAdmin ? "Administrator" : "User"}
              </ThemedText>
            </View>

            <View style={styles.statusRow}>
              <ThemedText style={styles.statusLabel}>Environment</ThemedText>
              <ThemedText style={styles.statusValue}>
                {DEV_MODE ? "Development" : "Production"}
              </ThemedText>
            </View>
          </ThemedView>

          {/* Prayer Times Management */}
          <ThemedView style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                name="calendar"
                size={24}
                color={Colors[colorScheme ?? "light"].primary}
              />
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Prayer Times Management
              </ThemedText>
            </View>

            <View style={styles.uploaderTabs}>
              <ThemedText style={styles.tabsTitle}>Upload Options</ThemedText>

              <View style={styles.uploaderContainer}>
                <View style={styles.uploaderHeader}>
                  <ThemedText style={styles.uploaderTitle}>
                    📅 Monthly Upload
                  </ThemedText>
                  <View style={styles.uploaderBadge}>
                    <ThemedText style={styles.uploaderBadgeText}>
                      RECOMMENDED
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.uploaderDescription}>
                  Upload prayer times for a specific month. This will merge with
                  existing data.
                </ThemedText>
                <CSVUploader onUploadComplete={loadLastUpdate} />
              </View>

              <View style={styles.uploaderContainer}>
                <View style={styles.uploaderHeader}>
                  <ThemedText style={styles.uploaderTitle}>
                    📆 Yearly Upload
                  </ThemedText>
                  <View style={[styles.uploaderBadge, styles.warningBadge]}>
                    <ThemedText style={styles.uploaderBadgeText}>
                      ADVANCED
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.uploaderDescription}>
                  Upload complete year data. This will replace ALL existing
                  prayer times.
                </ThemedText>
                <YearlyCSVUploader onUploadComplete={loadLastUpdate} />
              </View>
            </View>
          </ThemedView>

          {/* Development Tools */}
          {DEV_MODE && (
            <ThemedView style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol name="hammer" size={24} color="#FF9800" />
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Development Tools
                </ThemedText>
              </View>

              <View style={styles.devTools}>
                <TouchableOpacity
                  style={styles.devToolButton}
                  onPress={() =>
                    Alert.alert(
                      "Dev Info",
                      `User ID: ${user?.id || "N/A"}\nEmail: ${
                        user?.email || "N/A"
                      }\nAdmin: ${
                        user?.isAdmin || false
                      }\nDev Mode: ${DEV_MODE}`
                    )
                  }
                >
                  <IconSymbol name="info.circle" size={20} color="#2196F3" />
                  <ThemedText style={styles.devToolText}>
                    Show User Info
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.devToolButton}
                  onPress={async () => {
                    await refreshData();
                    Alert.alert("Success", "Prayer times data refreshed!");
                  }}
                >
                  <IconSymbol
                    name="arrow.clockwise"
                    size={20}
                    color="#4CAF50"
                  />
                  <ThemedText style={styles.devToolText}>
                    Force Refresh Data
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          )}

          {/* Data Management */}
          <ThemedView style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                name="gear"
                size={24}
                color={Colors[colorScheme ?? "light"].primary}
              />
              <ThemedText type="subtitle" style={styles.sectionTitle}>
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
          <ThemedView style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                name="person"
                size={24}
                color={Colors[colorScheme ?? "light"].primary}
              />
              <ThemedText type="subtitle" style={styles.sectionTitle}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop:
      Platform.OS === "ios" ? 60 : (StatusBar.currentHeight || 24) + 20,
    backgroundColor: Colors.light.primary,
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
    opacity: 0.7,
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
    color: Colors.light.primary,
  },
  uploaderContainer: {
    backgroundColor: "#f8f9fa",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
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
    opacity: 0.7,
    marginBottom: 16,
    lineHeight: 20,
  },
  devTools: {
    gap: 12,
  },
  devToolButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  devToolText: {
    fontSize: 16,
    fontWeight: "500",
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
    backgroundColor: "#FF9800",
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
    backgroundColor: "rgba(27, 94, 32, 0.1)",
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
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  accessDeniedActions: {
    width: "100%",
    alignItems: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: Colors.light.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  devBypass: {
    marginTop: 40,
    alignItems: "center",
    width: "100%",
  },
  devBypassButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FF9800",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#FF9800",
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
    opacity: 0.7,
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: 16,
  },
  bottomSpacing: {
    height: Platform.OS === "ios" ? 100 : 80,
  },
});

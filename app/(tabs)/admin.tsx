import React from "react";
import {
  Alert,
  ScrollView,
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

  React.useEffect(() => {
    loadLastUpdate();
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

  // Show access denied for non-admin users, but with dev bypass option
  if (!user?.isAdmin) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.accessDenied}>
          <IconSymbol
            name="person.badge.key"
            size={64}
            color={Colors[colorScheme ?? "light"].text}
          />
          <ThemedText type="title" style={styles.accessDeniedTitle}>
            Access Denied
          </ThemedText>
          <ThemedText style={styles.accessDeniedText}>
            You need admin privileges to access this section.
          </ThemedText>

          {DEV_MODE && (
            <View style={styles.devBypass}>
              <TouchableOpacity
                style={styles.devBypassButton}
                onPress={handleDevLoginAsAdmin}
              >
                <IconSymbol name="hammer" size={20} color="#fff" />
                <ThemedText style={styles.devBypassText}>
                  Dev: Grant Admin Access
                </ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.devBypassNote}>
                🔧 Development mode: Bypass admin restriction
              </ThemedText>
            </View>
          )}
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.header}>
        <View style={styles.titleRow}>
          <ThemedText type="title" style={styles.title}>
            Admin Panel
          </ThemedText>
          {DEV_MODE && (
            <View style={styles.devBadge}>
              <ThemedText style={styles.devBadgeText}>DEV</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={styles.subtitle}>
          Welcome, {user.name}
          {user.id.includes("dev") && " (Development Mode)"}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Prayer Times Management
        </ThemedText>

        {lastUpdate && (
          <ThemedView style={styles.infoCard}>
            <ThemedText style={styles.infoLabel}>Last Updated</ThemedText>
            <ThemedText style={styles.infoValue}>
              {new Date(lastUpdate).toLocaleString()}
            </ThemedText>
          </ThemedView>
        )}

        <View style={styles.uploaderTabs}>
          <ThemedText style={styles.tabsTitle}>Choose Upload Type:</ThemedText>

          <View style={styles.uploaderContainer}>
            <ThemedText style={styles.uploaderTitle}>
              📅 Monthly Upload
            </ThemedText>
            <ThemedText style={styles.uploaderDescription}>
              Upload prayer times for a specific month
            </ThemedText>
            <CSVUploader onUploadComplete={loadLastUpdate} />
          </View>

          <View style={styles.uploaderContainer}>
            <ThemedText style={styles.uploaderTitle}>
              📆 Yearly Upload
            </ThemedText>
            <ThemedText style={styles.uploaderDescription}>
              Upload complete year data (replaces all existing data)
            </ThemedText>
            <YearlyCSVUploader onUploadComplete={loadLastUpdate} />
          </View>
        </View>
      </ThemedView>

      {DEV_MODE && (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            🔧 Development Tools
          </ThemedText>

          <View style={styles.devTools}>
            <TouchableOpacity
              style={styles.devToolButton}
              onPress={() =>
                Alert.alert(
                  "Dev Info",
                  `User ID: ${user.id}\nEmail: ${user.email}\nAdmin: ${user.isAdmin}\nDev Mode: ${DEV_MODE}`
                )
              }
            >
              <IconSymbol name="info.circle" size={20} color="#2196F3" />
              <ThemedText style={styles.devToolText}>Show User Info</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.devToolButton}
              onPress={async () => {
                await refreshData();
                Alert.alert("Success", "Prayer times data refreshed!");
              }}
            >
              <IconSymbol name="arrow.clockwise" size={20} color="#4CAF50" />
              <ThemedText style={styles.devToolText}>
                Force Refresh Data
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      )}

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Data Management
        </ThemedText>

        <TouchableOpacity style={styles.dangerButton} onPress={handleClearData}>
          <IconSymbol name="trash" size={20} color="#fff" />
          <ThemedText style={styles.buttonText}>Clear All Data</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Account
        </ThemedText>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <IconSymbol name="arrow.right.square" size={20} color="#fff" />
          <ThemedText style={styles.buttonText}>Logout</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
  },
  devBadge: {
    backgroundColor: "#FF9800",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  devBadgeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  section: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: "#f5f5f5",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
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
    borderRadius: 8,
    marginBottom: 12,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#666",
    padding: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  accessDenied: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  accessDeniedTitle: {
    fontSize: 24,
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  accessDeniedText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 24,
  },
  devBypass: {
    marginTop: 40,
    alignItems: "center",
  },
  devBypassButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FF9800",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  devBypassText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  uploaderTabs: {
    gap: 20,
  },
  tabsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  uploaderContainer: {
    backgroundColor: "#f8f9fa",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  uploaderTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  uploaderDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
  },
  devBypassNote: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: "center",
    fontStyle: "italic",
  },
});

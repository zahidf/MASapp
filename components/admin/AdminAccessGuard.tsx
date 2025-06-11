import React from "react";
import {
  Alert,
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useColorScheme } from "@/hooks/useColorScheme";
import { ENV_CONFIG } from "@/utils/envConfig";

interface AdminAccessGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminAccessGuard({
  children,
  fallback,
}: AdminAccessGuardProps) {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Check if user is authorized admin
  const isAuthorizedAdmin =
    user?.email &&
    ENV_CONFIG.auth.authorizedAdmins.includes(user.email.toLowerCase());

  // Allow development bypass
  const isDevelopmentBypass =
    ENV_CONFIG.isDevelopment && ENV_CONFIG.auth.devSettings.bypassAuth;

  if (isAuthorizedAdmin || isDevelopmentBypass) {
    return <>{children}</>;
  }

  // If custom fallback provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default unauthorized access screen
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {ENV_CONFIG.isDevelopment && (
          <View style={styles.devBadge}>
            <ThemedText style={styles.devBadgeText}>
              🔧 Development Mode
            </ThemedText>
          </View>
        )}

        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${colors.primary}20` },
          ]}
        >
          <IconSymbol name="shield" size={80} color={colors.primary} />
        </View>

        <ThemedText type="title" style={[styles.title, { color: colors.text }]}>
          Admin Access Required
        </ThemedText>

        <ThemedText style={[styles.description, { color: `${colors.text}B3` }]}>
          {user ? (
            <>
              You are signed in as {user.email}, but this account does not have
              administrative privileges.
              {"\n\n"}
              Only authorized mosque administrators can access this section.
            </>
          ) : (
            "Please sign in with an authorized administrator account to access this section."
          )}
        </ThemedText>

        {ENV_CONFIG.isDevelopment && (
          <View style={styles.devInfo}>
            <ThemedText
              style={[styles.devInfoTitle, { color: colors.primary }]}
            >
              🔧 Development Info:
            </ThemedText>
            <ThemedText
              style={[styles.devInfoText, { color: `${colors.text}80` }]}
            >
              Authorized admins: {ENV_CONFIG.auth.authorizedAdmins.join(", ")}
              {"\n"}
              Current user: {user?.email || "Not signed in"}
              {"\n"}
              Is authorized: {isAuthorizedAdmin ? "Yes" : "No"}
              {"\n"}
              Dev bypass: {isDevelopmentBypass ? "Enabled" : "Disabled"}
            </ThemedText>
          </View>
        )}

        <View style={styles.actions}>
          {!user && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                // Navigate to login screen
                // This would typically use navigation
                Alert.alert(
                  "Sign In Required",
                  "Please sign in with an authorized administrator account.",
                  [{ text: "OK" }]
                );
              }}
            >
              <IconSymbol name="person" size={20} color="#fff" />
              <ThemedText style={styles.actionButtonText}>Sign In</ThemedText>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.secondaryButton,
              { borderColor: colors.primary },
            ]}
            onPress={() => {
              Alert.alert(
                "Contact Administrator",
                "If you believe you should have access to this section, please contact the mosque administration.\n\nEmail: info@masjidabubakr.org.uk\nPhone: +44 7973 573059",
                [{ text: "OK" }]
              );
            }}
          >
            <IconSymbol name="envelope" size={20} color={colors.primary} />
            <ThemedText
              style={[styles.actionButtonText, { color: colors.primary }]}
            >
              Contact Admin
            </ThemedText>
          </TouchableOpacity>
        </View>

        {user && (
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={() => {
              Alert.alert(
                "Sign Out",
                "Sign out and try with a different account?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: () => {
                      // Handle sign out
                      // This would typically use the auth context
                    },
                  },
                ]
              );
            }}
          >
            <ThemedText
              style={[styles.signOutText, { color: `${colors.text}80` }]}
            >
              Sign out and try different account
            </ThemedText>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    alignItems: "center",
    maxWidth: 400,
    width: "100%",
  },
  devBadge: {
    backgroundColor: "#FF9800",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  devBadgeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "bold",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  devInfo: {
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: "100%",
  },
  devInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  devInfoText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "monospace",
  },
  actions: {
    width: "100%",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  signOutButton: {
    marginTop: 24,
    paddingVertical: 12,
  },
  signOutText: {
    fontSize: 14,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});

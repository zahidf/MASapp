import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useColorScheme } from "@/hooks/useColorScheme";
import { ENV_CONFIG } from "@/utils/envConfig";

const DEV_MODE = __DEV__;

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const { login, loginWithGoogle, devLogin, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // If user is already authenticated as admin, redirect to admin
  React.useEffect(() => {
    if (user?.isAdmin) {
      router.replace("/(tabs)/admin");
    }
  }, [user]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    // Check if email is authorised for admin access (in production)
    if (
      !ENV_CONFIG.isDevelopment &&
      !ENV_CONFIG.auth.authorizedAdmins.includes(email.toLowerCase())
    ) {
      Alert.alert(
        "Unauthorised Access",
        "This email address is not authorised for administrative access.\n\nOnly authorised mosque administrators can access the admin panel.\n\nContact: info@masjidabubakr.org.uk",
        [{ text: "OK" }]
      );
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);

      // On successful login, navigate to admin
      router.replace("/(tabs)/admin");
    } catch (error: any) {
      const errorMessage = error.message || "Login failed. Please try again.";
      Alert.alert("Login Failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();

      // On successful login, navigate to admin
      router.replace("/(tabs)/admin");
    } catch (error: any) {
      let errorMessage = "Google login failed. Please try again.";

      // Handle specific error messages
      if (error.message) {
        if (error.message.includes("cancelled")) {
          errorMessage = "Google sign-in was cancelled.";
        } else if (error.message.includes("not available")) {
          errorMessage =
            "Google Play Services are not available on this device.";
        } else if (error.message.includes("Unauthorised")) {
          errorMessage = error.message; // Show the full unauthorised message
        } else if (error.message.includes("not configured")) {
          errorMessage = "Google authentication is not properly configured.";
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert("Google Sign-In Failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevLogin = async () => {
    if (!DEV_MODE) return;

    setIsLoading(true);
    try {
      await devLogin();
      router.replace("/(tabs)/admin");
    } catch (error) {
      Alert.alert("Error", "Dev login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToApp = () => {
    router.back();
  };

  const colors = Colors[colorScheme ?? "light"];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ThemedView style={styles.content}>
        {/* Header with back button */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBackToApp} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
            <ThemedText style={[styles.backText, { color: colors.text }]}>
              Back to App
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <View
            style={[
              styles.logoContainer,
              { backgroundColor: `${colors.primary}20` },
            ]}
          >
            <IconSymbol
              name="gear.circle.fill"
              size={48}
              color={colors.primary}
            />
          </View>

          <ThemedText
            type="title"
            style={[styles.title, { color: colors.text }]}
          >
            Admin Login
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: `${colors.text}80` }]}>
            Sign in to access administrative features
          </ThemedText>

          {DEV_MODE && (
            <View style={styles.devBadge}>
              <ThemedText style={styles.devBadgeText}>
                🔧 Development Mode
              </ThemedText>
            </View>
          )}
        </View>

        {/* Admin Access Notice */}
        <View
          style={[
            styles.accessNotice,
            { backgroundColor: `${colors.primary}10` },
          ]}
        >
          <IconSymbol name="shield" size={24} color={colors.primary} />
          <View style={styles.accessNoticeContent}>
            <ThemedText
              style={[styles.accessNoticeTitle, { color: colors.primary }]}
            >
              Administrative Access
            </ThemedText>
            <ThemedText
              style={[styles.accessNoticeText, { color: colors.text }]}
            >
              {ENV_CONFIG.isDevelopment
                ? "Development mode allows testing with any credentials."
                : "Only authorised mosque administrators can access this area."}
            </ThemedText>
          </View>
        </View>

        {DEV_MODE && (
          <View style={styles.devSection}>
            <TouchableOpacity
              style={[styles.devButton, isLoading && styles.buttonDisabled]}
              onPress={handleDevLogin}
              disabled={isLoading}
            >
              <IconSymbol name="hammer" size={20} color="#fff" />
              <ThemedText style={styles.buttonText}>
                Quick Dev Login (Bypass Auth)
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View
                style={[
                  styles.dividerLine,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].text + "30",
                  },
                ]}
              />
              <ThemedText
                style={[styles.dividerText, { color: `${colors.text}60` }]}
              >
                OR USE REGULAR LOGIN
              </ThemedText>
              <View
                style={[
                  styles.dividerLine,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].text + "30",
                  },
                ]}
              />
            </View>
          </View>
        )}

        <View style={styles.form}>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: `${colors.text}30`,
                backgroundColor: colors.surface,
              },
            ]}
            placeholder={
              ENV_CONFIG.isDevelopment
                ? "Email (any for testing)"
                : "Authorised admin email only"
            }
            placeholderTextColor={Colors[colorScheme ?? "light"].text + "60"}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isLoading}
          />

          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: `${colors.text}30`,
                backgroundColor: colors.surface,
              },
            ]}
            placeholder="Password"
            placeholderTextColor={Colors[colorScheme ?? "light"].text + "60"}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.primary },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ThemedText style={styles.buttonText}>Signing in...</ThemedText>
              </View>
            ) : (
              <View style={styles.buttonRow}>
                <IconSymbol name="person" size={20} color="#fff" />
                <ThemedText style={styles.buttonText}>Sign In</ThemedText>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: Colors[colorScheme ?? "light"].text + "30" },
              ]}
            />
            <ThemedText
              style={[styles.dividerText, { color: `${colors.text}60` }]}
            >
              OR
            </ThemedText>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: Colors[colorScheme ?? "light"].text + "30" },
              ]}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.googleButton,
              { borderColor: colors.primary },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleGoogleLogin}
            disabled={isLoading}
          >
            <IconSymbol name="globe" size={20} color={colors.primary} />
            <ThemedText
              style={[styles.googleButtonText, { color: colors.primary }]}
            >
              Sign in with Google
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Authorised Admin Info */}
        <View
          style={[
            styles.authorisedAdminsSection,
            { backgroundColor: `${colors.primary}10` },
          ]}
        >
          <ThemedText
            style={[styles.authorisedAdminsTitle, { color: colors.primary }]}
          >
            Authorised Administrators:
          </ThemedText>
          {ENV_CONFIG.auth.authorizedAdmins.map((email, index) => (
            <ThemedText
              key={index}
              style={[styles.authorisedAdminEmail, { color: colors.text }]}
            >
              • {email}
            </ThemedText>
          ))}
        </View>

        {DEV_MODE && (
          <View
            style={[styles.devNote, { backgroundColor: `${colors.primary}10` }]}
          >
            <ThemedText style={[styles.devNoteText, { color: colors.text }]}>
              🔧 Development Mode:
              {"\n"}• Use "Quick Dev Login" to bypass authentication
              {"\n"}• Any email with 'admin' or 'dev' gets admin privileges
              {"\n"}• Authorised admins:{" "}
              {ENV_CONFIG.auth.authorizedAdmins.join(", ")}
              {"\n"}• Auto-login on app start if no user exists
            </ThemedText>
          </View>
        )}

        {!ENV_CONFIG.isDevelopment && (
          <View
            style={[styles.productionNotice, { backgroundColor: "#FFEBEE" }]}
          >
            <IconSymbol
              name="exclamationmark.triangle"
              size={20}
              color="#F44336"
            />
            <ThemedText style={styles.productionNoticeText}>
              🔒 Production Mode: Only pre-authorised email addresses can access
              admin features.
              {"\n\n"}Contact info@masjidabubakr.org.uk for access requests.
            </ThemedText>
          </View>
        )}
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  headerRow: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: "500",
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
    marginTop: 60,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  devBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  devBadgeText: {
    fontSize: 14,
    color: "#1976D2",
    fontWeight: "600",
  },
  accessNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#1B5E20",
  },
  accessNoticeContent: {
    flex: 1,
  },
  accessNoticeTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  accessNoticeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  devSection: {
    marginBottom: 20,
  },
  devButton: {
    backgroundColor: "#FF9800",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  form: {
    width: "100%",
    marginBottom: 20,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontWeight: "500",
  },
  googleButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  authorisedAdminsSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  authorisedAdminsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  authorisedAdminEmail: {
    fontSize: 13,
    marginBottom: 4,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  devNote: {
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
    marginTop: 20,
  },
  devNoteText: {
    fontSize: 12,
    lineHeight: 18,
  },
  productionNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#F44336",
  },
  productionNoticeText: {
    fontSize: 12,
    color: "#C62828",
    lineHeight: 18,
    flex: 1,
  },
});

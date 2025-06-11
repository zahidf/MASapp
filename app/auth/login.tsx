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
  const { login, loginWithGoogle, devLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    // Check if email is authorized for admin access (in production)
    if (
      !ENV_CONFIG.isDevelopment &&
      !ENV_CONFIG.auth.authorizedAdmins.includes(email.toLowerCase())
    ) {
      Alert.alert(
        "Unauthorized Access",
        "This email address is not authorized for administrative access.\n\nOnly authorized mosque administrators can access the admin panel.\n\nContact: info@masjidabubakr.org.uk",
        [{ text: "OK" }]
      );
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      router.back();
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
      router.back();
    } catch (error: any) {
      const errorMessage =
        error.message || "Google login failed. Please try again.";
      Alert.alert("Google Login Failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevLogin = async () => {
    if (!DEV_MODE) return;

    setIsLoading(true);
    try {
      await devLogin();
      router.back();
    } catch (error) {
      Alert.alert("Error", "Dev login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ThemedView style={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Admin Login
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Sign in to access admin features
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
        <View style={styles.accessNotice}>
          <IconSymbol name="shield" size={24} color="#FF9800" />
          <View style={styles.accessNoticeContent}>
            <ThemedText style={styles.accessNoticeTitle}>
              Restricted Access
            </ThemedText>
            <ThemedText style={styles.accessNoticeText}>
              {ENV_CONFIG.isDevelopment
                ? "Development mode allows testing with any credentials."
                : "Only authorized mosque administrators can access this area."}
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
              <ThemedText style={styles.dividerText}>
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
                color: Colors[colorScheme ?? "light"].text,
                borderColor: Colors[colorScheme ?? "light"].text + "30",
                backgroundColor: Colors[colorScheme ?? "light"].background,
              },
            ]}
            placeholder={
              ENV_CONFIG.isDevelopment
                ? "Email (any for testing)"
                : "Authorized admin email only"
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
                color: Colors[colorScheme ?? "light"].text,
                borderColor: Colors[colorScheme ?? "light"].text + "30",
                backgroundColor: Colors[colorScheme ?? "light"].background,
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
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <ThemedText style={styles.buttonText}>
              {isLoading ? "Signing in..." : "Sign In"}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: Colors[colorScheme ?? "light"].text + "30" },
              ]}
            />
            <ThemedText style={styles.dividerText}>OR</ThemedText>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: Colors[colorScheme ?? "light"].text + "30" },
              ]}
            />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, isLoading && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={isLoading}
          >
            <IconSymbol name="globe" size={20} color="#4285F4" />
            <ThemedText style={styles.googleButtonText}>
              Sign in with Google
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Authorized Admin Info */}
        <View style={styles.authorizedAdminsSection}>
          <ThemedText style={styles.authorizedAdminsTitle}>
            Authorized Administrators:
          </ThemedText>
          {ENV_CONFIG.auth.authorizedAdmins.map((email, index) => (
            <ThemedText key={index} style={styles.authorizedAdminEmail}>
              • {email}
            </ThemedText>
          ))}
        </View>

        {DEV_MODE && (
          <View style={styles.devNote}>
            <ThemedText style={styles.devNoteText}>
              🔧 Development Mode:
              {"\n"}• Use "Quick Dev Login" to bypass authentication
              {"\n"}• Any email with 'admin' or 'dev' gets admin privileges
              {"\n"}• Authorized admins:{" "}
              {ENV_CONFIG.auth.authorizedAdmins.join(", ")}
              {"\n"}• Auto-login on app start if no user exists
            </ThemedText>
          </View>
        )}

        {!ENV_CONFIG.isDevelopment && (
          <View style={styles.productionNotice}>
            <ThemedText style={styles.productionNoticeText}>
              🔒 Production Mode: Only pre-authorized email addresses can access
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
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 22,
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
    backgroundColor: "#FFF3E0",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  accessNoticeContent: {
    flex: 1,
  },
  accessNoticeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E65100",
    marginBottom: 4,
  },
  accessNoticeText: {
    fontSize: 14,
    color: "#BF360C",
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
    backgroundColor: "#2E7D32",
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
    opacity: 0.6,
    fontWeight: "500",
  },
  googleButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#4285F4",
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
    color: "#4285F4",
    fontSize: 16,
    fontWeight: "600",
  },
  authorizedAdminsSection: {
    backgroundColor: "#E8F5E9",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  authorizedAdminsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
    marginBottom: 8,
  },
  authorizedAdminEmail: {
    fontSize: 13,
    color: "#388E3C",
    marginBottom: 4,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  devNote: {
    backgroundColor: "#E8F5E9",
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
    marginTop: 20,
  },
  devNoteText: {
    fontSize: 12,
    color: "#2E7D32",
    lineHeight: 18,
  },
  productionNotice: {
    backgroundColor: "#FFEBEE",
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
    textAlign: "center",
  },
});

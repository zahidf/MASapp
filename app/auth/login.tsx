import { FirebaseAppleAuthService } from "@/utils/firebaseAppleAuth";
import * as AppleAuthentication from "expo-apple-authentication";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useColorScheme } from "@/hooks/useColorScheme";
import { ENV_CONFIG } from "@/utils/envConfig";


export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const { loginWithApple, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [isAppleSignInAvailable, setIsAppleSignInAvailable] = useState(false);

  // If user is already authenticated as admin, redirect to admin
  React.useEffect(() => {
    if (user?.isAdmin) {
      router.replace("/(tabs)/admin");
    }
  }, [user]);

  // Check Apple Sign-In availability
  React.useEffect(() => {
    checkAppleSignInAvailability();
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const checkAppleSignInAvailability = async () => {
    const available = await FirebaseAppleAuthService.isAvailable();
    setIsAppleSignInAvailable(available);
  };


  const handleAppleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithApple();
      router.replace("/(tabs)/admin");
    } catch (error: any) {
      let errorMessage = "Apple Sign-In failed. Please try again.";
      
      if (error.message) {
        if (error.message.includes("cancelled")) {
          errorMessage = "Sign-in was cancelled.";
        } else if (error.message.includes("not available")) {
          errorMessage = "Apple Sign-In is not available on this device.";
        } else if (error.message.includes("Unauthorised")) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert("Sign-In Failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  const handleBackToApp = () => {
    router.replace("/(tabs)");
  };

  const colors = Colors[colorScheme ?? "light"];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* iOS-style Navigation Bar */}
      <BlurView
        intensity={85}
        tint={colorScheme === "dark" ? "dark" : "light"}
        style={styles.navigationBar}
      >
        <View style={styles.navContent}>
          <TouchableOpacity onPress={handleBackToApp} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>
              Prayer Times
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Logo and Title Section */}
          <View style={styles.headerSection}>
            <View
              style={[
                styles.logoContainer,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <IconSymbol
                name="person.badge.key"
                size={48}
                color={colors.primary}
              />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              Admin Sign In
            </Text>
            <Text style={[styles.subtitle, { color: colors.text + "80" }]}>
              Access administrative features
            </Text>
          </View>

          {/* Sign In Options Section */}
          <View style={styles.signInSection}>
            {/* Apple Sign In Button - Use native button on iOS */}
            {isAppleSignInAvailable && Platform.OS === "ios" ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={
                  colorScheme === "dark"
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={14}
                style={[styles.appleButton, { opacity: isLoading ? 0.6 : 1 }]}
                onPress={handleAppleLogin}
              />
            ) : null}


          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
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
              <IconSymbol name="info.circle" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>
                  Administrative Access
                </Text>
                <Text style={[styles.infoText, { color: colors.text + "80" }]}>
                  Only authorised mosque administrators can access this section.
                  {"\n\n"}
                  Contact: info@masjidabubakr.org.uk
                </Text>
              </View>
            </BlurView>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // iOS-style Navigation Bar
  navigationBar: {
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  
  navContent: {
    paddingHorizontal: 16,
  },
  
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  
  backText: {
    fontSize: 17,
    fontWeight: "400",
    letterSpacing: -0.4,
  },
  
  // Content
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    flexGrow: 1,
  },
  
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  
  // Header Section
  headerSection: {
    alignItems: "center",
    marginBottom: 48,
  },
  
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  
  title: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: 0.37,
    marginBottom: 8,
  },
  
  subtitle: {
    fontSize: 17,
    fontWeight: "400",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  
  // Sign In Section
  signInSection: {
    marginBottom: 32,
  },
  
  // Apple Button - Following Apple HIG
  appleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
    marginBottom: 16,
  },
  
  appleButtonText: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  
  // Divider
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  
  dividerLine: {
    flex: 1,
    height: 1,
  },
  
  dividerText: {
    marginHorizontal: 16,
    fontSize: 15,
    fontWeight: "400",
    letterSpacing: -0.2,
  },
  
  // Form Section
  formSection: {
    gap: 16,
  },
  
  inputContainer: {
    marginBottom: 4,
  },
  
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 17,
    letterSpacing: -0.4,
  },
  
  signInButton: {
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  
  // Dev Section
  devSection: {
    marginTop: 32,
    alignItems: "center",
    gap: 16,
  },
  
  devBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  
  devBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.08,
  },
  
  devButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 2,
  },
  
  devButtonText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  
  // Info Section
  infoSection: {
    marginTop: "auto",
  },
  
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  
  infoContent: {
    flex: 1,
  },
  
  infoTitle: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  
  infoText: {
    fontSize: 13,
    letterSpacing: -0.08,
    lineHeight: 18,
  },
});
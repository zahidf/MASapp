// contexts/AuthContext.tsx
import { User } from "@/types/prayer";
import { AppleAuthService } from "@/utils/appleAuth";
import { ENV_CONFIG, type AppConfig } from "@/utils/envConfig";
import { GoogleAuthService } from "@/utils/googleAuth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, ReactNode, useEffect, useState } from "react";
import { Platform } from "react-native";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  devLogin: () => Promise<void>; // Development only
  config: AppConfig; // Expose config for debugging
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);

      // Initialize Google Sign-In if configured
      if (GoogleAuthService.isConfigured()) {
        await GoogleAuthService.initialize();

        // Check if user has previously signed in with Google
        const hasPreviousSignIn = await GoogleAuthService.hasPreviousSignIn();
        if (hasPreviousSignIn) {
          // Try to sign in silently
          const googleUser = await GoogleAuthService.signInSilently();
          if (googleUser) {
            // Validate and create user from Google account
            const validatedUser = await validateGoogleUser(googleUser);
            if (validatedUser) {
              await saveUser(validatedUser);
              if (ENV_CONFIG.debugMode) {
                console.log(
                  "Silent Google Sign-In successful:",
                  validatedUser.email
                );
              }
              return; // Exit early - we have a valid Google user
            }
          }
        }
      }

      // Load existing user session from storage
      await loadUser();

      // Log environment info in development
      if (ENV_CONFIG.isDevelopment && ENV_CONFIG.debugMode) {
        console.log("🔧 Auth Environment Config:", {
          isDevelopment: ENV_CONFIG.isDevelopment,
          isProduction: ENV_CONFIG.isProduction,
          debugMode: ENV_CONFIG.debugMode,
          googleConfigStatus: GoogleAuthService.getConfigStatus(),
          appleConfigStatus: AppleAuthService.getConfigStatus(),
          hasApiConfig: !!ENV_CONFIG.api.baseUrl,
          authorisedAdmins: ENV_CONFIG.auth.authorizedAdmins.length,
        });
      }
    } catch (error) {
      console.error("Auth initialisation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem("@user_data");
      if (userData) {
        const parsedUser = JSON.parse(userData);

        // Validate the stored user data
        if (isValidUser(parsedUser)) {
          setUser(parsedUser);

          // If user was signed in with Google, verify the session is still valid
          if (
            parsedUser.id?.startsWith("google-") &&
            !ENV_CONFIG.isDevelopment
          ) {
            const currentGoogleUser = await GoogleAuthService.getCurrentUser();
            if (!currentGoogleUser) {
              // Google session expired, clear local session
              console.log("Google session expired, clearing local session");
              await clearUserData();
            }
          }

          // If user was signed in with Apple, verify the credential state
          if (
            parsedUser.id?.startsWith("apple-") &&
            Platform.OS === "ios" &&
            !ENV_CONFIG.isDevelopment
          ) {
            const appleUserId = parsedUser.id.replace("apple-", "");
            const credentialState = await AppleAuthService.getCredentialState(appleUserId);
            if (credentialState !== 1) { // 1 = Authorized
              console.log("Apple credential revoked, clearing local session");
              await clearUserData();
            }
          }
        } else {
          // Invalid user data, clear it
          console.warn("Invalid user data found, clearing...");
          await clearUserData();
        }
      } else if (
        ENV_CONFIG.isDevelopment &&
        ENV_CONFIG.auth.devSettings.bypassAuth
      ) {
        // Auto-login in development mode if no user data exists
        const devUser: User = {
          id: "dev-admin",
          email: ENV_CONFIG.auth.devSettings.adminEmail,
          name: "Dev Admin",
          isAdmin: true,
        };
        await saveUser(devUser);
      }
    } catch (error) {
      console.error("Error loading user:", error);
      await clearUserData();
    }
  };

  const isValidUser = (userData: any): userData is User => {
    return (
      userData &&
      typeof userData === "object" &&
      typeof userData.id === "string" &&
      typeof userData.email === "string" &&
      typeof userData.name === "string" &&
      typeof userData.isAdmin === "boolean"
    );
  };

  const validateGoogleUser = async (googleUser: any): Promise<User | null> => {
    try {
      // Extract user info from Google response
      const user = googleUser.user || googleUser;
      const userEmail = user.email;

      if (!userEmail) {
        console.error("No email address found in Google account");
        return null;
      }

      // Check if the Google account email is authorised for admin access
      const isAuthorisedAdmin = ENV_CONFIG.auth.authorizedAdmins.includes(
        userEmail.toLowerCase()
      );

      // In production, only authorised admins can proceed
      if (!isAuthorisedAdmin && !ENV_CONFIG.isDevelopment) {
        console.warn("Unauthorised Google user:", userEmail);
        return null;
      }

      // Create user object
      const authenticatedUser: User = {
        id: `google-${user.id}`,
        email: userEmail,
        name: user.name || user.givenName || userEmail.split("@")[0],
        isAdmin: isAuthorisedAdmin,
      };

      return authenticatedUser;
    } catch (error) {
      console.error("Error validating Google user:", error);
      return null;
    }
  };

  const saveUser = async (userData: User) => {
    try {
      await AsyncStorage.setItem("@user_data", JSON.stringify(userData));
      setUser(userData);

      if (ENV_CONFIG.debugMode) {
        console.log("User saved:", {
          email: userData.email,
          isAdmin: userData.isAdmin,
          authMethod: userData.id.startsWith("google-") ? "Google" : 
                      userData.id.startsWith("apple-") ? "Apple" : "Email",
        });
      }
    } catch (error) {
      console.error("Error saving user:", error);
      throw new Error("Failed to save user data");
    }
  };

  const clearUserData = async () => {
    try {
      await AsyncStorage.removeItem("@user_data");
      setUser(null);
    } catch (error) {
      console.error("Error clearing user data:", error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);

      if (ENV_CONFIG.isDevelopment) {
        // Development mode login
        if (
          email === ENV_CONFIG.auth.devSettings.testAdminEmail &&
          password === ENV_CONFIG.auth.devSettings.testAdminPassword
        ) {
          const mockUser: User = {
            id: "test-admin",
            email: ENV_CONFIG.auth.devSettings.testAdminEmail,
            name: "Test Admin",
            isAdmin: true,
          };
          await saveUser(mockUser);
          return;
        }

        // Any email/password combo works in dev mode, but check admin authorisation
        const isAuthorisedAdmin =
          ENV_CONFIG.auth.authorizedAdmins.includes(email.toLowerCase()) ||
          email.toLowerCase().includes("admin") ||
          email.toLowerCase().includes("dev");

        const mockUser: User = {
          id: "dev-" + Date.now().toString(),
          email,
          name: email.split("@")[0],
          isAdmin: isAuthorisedAdmin,
        };

        await saveUser(mockUser);
        return;
      }

      // Production login logic
      if (!ENV_CONFIG.api.baseUrl) {
        // No API configured, use mock authentication but with strict admin checking
        const isAuthorisedAdmin = ENV_CONFIG.auth.authorizedAdmins.includes(
          email.toLowerCase()
        );

        if (!isAuthorisedAdmin) {
          throw new Error(
            `Unauthorised access: ${email} is not authorised for administrative access.\n\nContact: info@masjidabubakr.org.uk`
          );
        }

        // Create authenticated user for authorised admin
        const mockUser: User = {
          id: "prod-" + Date.now(),
          email,
          name: email.split("@")[0],
          isAdmin: true, // Only authorised emails reach this point
        };

        await saveUser(mockUser);
        return;
      }

      // TODO: Implement actual API call for production
      throw new Error("API authentication not yet implemented");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);

      // Check if Google authentication is configured
      if (!GoogleAuthService.isConfigured()) {
        console.warn("Google OAuth configuration missing");

        if (ENV_CONFIG.isDevelopment) {
          // Fall back to mock Google login in development
          const mockUser: User = {
            id: "google-dev-" + Date.now(),
            email: ENV_CONFIG.auth.devSettings.adminEmail,
            name: "Dev Admin (Google Mock)",
            isAdmin: true,
          };
          await saveUser(mockUser);
          return;
        } else {
          throw new Error(
            "Google authentication is not configured. Please contact the administrator."
          );
        }
      }

      // Perform Google Sign-In
      const googleUser = await GoogleAuthService.signIn();

      // Validate and save the authenticated user
      const validatedUser = await validateGoogleUser(googleUser);
      if (!validatedUser) {
        // User validation failed - sign out from Google
        await GoogleAuthService.signOut();
        throw new Error(
          `Unauthorised access: Your Google account is not authorised for administrative access.\n\nContact: info@masjidabubakr.org.uk`
        );
      }

      await saveUser(validatedUser);

      console.log("Google authentication successful:", {
        email: validatedUser.email,
        name: validatedUser.name,
        isAdmin: validatedUser.isAdmin,
      });
    } catch (error) {
      console.error("Google login error:", error);

      // Re-throw with more user-friendly messages for common errors
      if (error instanceof Error) {
        if (error.message.includes("cancelled")) {
          throw new Error("Google sign-in was cancelled");
        } else if (error.message.includes("PLAY_SERVICES_NOT_AVAILABLE")) {
          throw new Error(
            "Google Play Services are not available on this device"
          );
        } else if (error.message.includes("IN_PROGRESS")) {
          throw new Error("Google sign-in is already in progress");
        }
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithApple = async () => {
    try {
      setIsLoading(true);

      // Check if Apple authentication is available
      const isAvailable = await AppleAuthService.isAvailable();
      
      if (!isAvailable) {
        if (ENV_CONFIG.isDevelopment) {
          // Use mock Apple login in development
          const mockUser = await AppleAuthService.mockSignIn();
          await saveUser(mockUser);
          return;
        } else {
          throw new Error(
            "Apple Sign-In is not available on this device. Please ensure you're using an iOS device with iOS 13.0 or later."
          );
        }
      }

      // Perform Apple Sign-In
      const appleUser = await AppleAuthService.signIn();
      await saveUser(appleUser);

      console.log("Apple authentication successful:", {
        email: appleUser.email,
        name: appleUser.name,
        isAdmin: appleUser.isAdmin,
      });
    } catch (error) {
      console.error("Apple login error:", error);

      // Re-throw with more user-friendly messages
      if (error instanceof Error) {
        if (error.message.includes("cancelled")) {
          throw new Error("Sign-in was cancelled");
        }
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const devLogin = async () => {
    if (!ENV_CONFIG.isDevelopment) {
      throw new Error("Development login only available in development mode");
    }

    try {
      setIsLoading(true);

      const devUser: User = {
        id: "dev-bypass-" + Date.now(),
        email: ENV_CONFIG.auth.devSettings.adminEmail,
        name: "Dev Bypass User",
        isAdmin: true,
      };

      await saveUser(devUser);
    } catch (error) {
      console.error("Dev login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);

      // If user was signed in with Google, sign out from Google too
      if (user?.id?.startsWith("google-")) {
        try {
          await GoogleAuthService.signOut();
        } catch (googleSignOutError) {
          // Don't fail the entire logout if Google sign-out fails
          console.warn("Google sign-out failed:", googleSignOutError);
        }
      }

      // Note: Apple doesn't have a sign-out method, just clear local session

      // Clear local session
      await clearUserData();

      console.log("Logout successful");
    } catch (error) {
      console.error("Error logging out:", error);
      // Even if there's an error, clear local data
      await clearUserData();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = {
    user,
    isLoading,
    login,
    loginWithGoogle,
    loginWithApple,
    logout,
    devLogin,
    config: ENV_CONFIG,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
};
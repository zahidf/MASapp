import { User } from "@/types/prayer";
import { ENV_CONFIG, type AppConfig } from "@/utils/envConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, ReactNode, useEffect, useState } from "react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  devLogin: () => Promise<void>; // Development only
  config: AppConfig; // Expose config for debugging
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();

    // Log environment info in development
    if (ENV_CONFIG.isDevelopment && ENV_CONFIG.debugMode) {
      console.log("🔧 Auth Environment Config:", {
        isDevelopment: ENV_CONFIG.isDevelopment,
        isProduction: ENV_CONFIG.isProduction,
        debugMode: ENV_CONFIG.debugMode,
        hasGoogleConfig: !!ENV_CONFIG.auth.googleClientId.ios,
        hasFirebaseConfig: !!ENV_CONFIG.auth.firebase.apiKey,
        hasApiConfig: !!ENV_CONFIG.api.baseUrl,
      });
    }
  }, []);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem("@user_data");
      if (userData) {
        setUser(JSON.parse(userData));
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
    } finally {
      setIsLoading(false);
    }
  };

  const saveUser = async (userData: User) => {
    try {
      await AsyncStorage.setItem("@user_data", JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error("Error saving user:", error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
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

        // Any email/password combo works in dev mode, but check admin authorization
        const isAuthorizedAdmin =
          ENV_CONFIG.auth.authorizedAdmins.includes(email.toLowerCase()) ||
          email.toLowerCase().includes("admin") ||
          email.toLowerCase().includes("dev");

        const mockUser: User = {
          id: Date.now().toString(),
          email,
          name: email.split("@")[0],
          isAdmin: isAuthorizedAdmin,
        };

        await saveUser(mockUser);
        return;
      }

      // Production login logic
      if (!ENV_CONFIG.api.baseUrl) {
        throw new Error("API configuration missing");
      }

      // In production, only authorize specific admin emails
      const isAuthorizedAdmin = ENV_CONFIG.auth.authorizedAdmins.includes(
        email.toLowerCase()
      );

      // TODO: Implement actual API call for production
      // const response = await fetch(`${ENV_CONFIG.api.baseUrl}/auth/login`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ email, password }),
      // });

      // For now, use mock login but with proper admin authorization
      if (!isAuthorizedAdmin) {
        throw new Error("Unauthorized: Admin access restricted");
      }

      const mockUser: User = {
        id: "prod-" + Date.now(),
        email,
        name: email.split("@")[0],
        isAdmin: true, // Only authorized emails reach this point
      };

      await saveUser(mockUser);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      // Check if Google configuration is available
      if (
        !ENV_CONFIG.auth.googleClientId.ios &&
        !ENV_CONFIG.auth.googleClientId.android
      ) {
        console.warn("Google OAuth configuration missing");

        if (ENV_CONFIG.isDevelopment) {
          // Fall back to mock Google login in development
          const mockUser: User = {
            id: "google-dev-" + Date.now(),
            email: ENV_CONFIG.auth.devSettings.adminEmail,
            name: "Dev Admin (Google)",
            isAdmin: true,
          };
          await saveUser(mockUser);
          return;
        } else {
          throw new Error("Google authentication not configured");
        }
      }

      // TODO: Implement actual Google SSO
      // const googleResult = await GoogleSignIn.signInAsync();
      // const { user } = googleResult;
      // const userEmail = user.email;

      // For now, simulate Google login result
      // In production, replace this with actual Google auth result
      const simulatedGoogleEmail = ENV_CONFIG.isDevelopment
        ? ENV_CONFIG.auth.devSettings.adminEmail
        : "zahidfaqiri786@gmail.com"; // Default to authorized admin for testing

      // Check if the Google account email is authorized for admin access
      const isAuthorizedAdmin = ENV_CONFIG.auth.authorizedAdmins.includes(
        simulatedGoogleEmail.toLowerCase()
      );

      if (!isAuthorizedAdmin && !ENV_CONFIG.isDevelopment) {
        throw new Error(
          "Unauthorized: This Google account does not have admin access"
        );
      }

      const mockUser: User = {
        id: "google-" + Date.now(),
        email: simulatedGoogleEmail,
        name:
          simulatedGoogleEmail === "zahidfaqiri786@gmail.com"
            ? "Zahid Faqiri"
            : ENV_CONFIG.isDevelopment
            ? "Dev Admin (Google)"
            : "Admin User",
        isAdmin: isAuthorizedAdmin,
      };

      await saveUser(mockUser);
    } catch (error) {
      console.error("Google login error:", error);
      throw error;
    }
  };

  const devLogin = async () => {
    if (!ENV_CONFIG.isDevelopment) {
      throw new Error("Development login only available in development mode");
    }

    const devUser: User = {
      id: "dev-bypass",
      email: ENV_CONFIG.auth.devSettings.adminEmail,
      name: "Dev Bypass User",
      isAdmin: true,
    };

    await saveUser(devUser);
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("@user_data");
      setUser(null);
    } catch (error) {
      console.error("Error logging out:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        loginWithGoogle,
        logout,
        devLogin,
        config: ENV_CONFIG,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
};

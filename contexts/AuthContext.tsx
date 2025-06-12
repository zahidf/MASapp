import { User } from "@/types/prayer";
import { ENV_CONFIG, type AppConfig } from "@/utils/envConfig";
import { GoogleAuthService } from "@/utils/googleAuth";
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
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Initialize Google Sign-In if configured
      if (GoogleAuthService.isConfigured()) {
        await GoogleAuthService.initialize();
      }

      // Load existing user session
      await loadUser();

      // Log environment info in development
      if (ENV_CONFIG.isDevelopment && ENV_CONFIG.debugMode) {
        console.log("🔧 Auth Environment Config:", {
          isDevelopment: ENV_CONFIG.isDevelopment,
          isProduction: ENV_CONFIG.isProduction,
          debugMode: ENV_CONFIG.debugMode,
          googleConfigStatus: GoogleAuthService.getConfigStatus(),
          hasApiConfig: !!ENV_CONFIG.api.baseUrl,
        });
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem("@user_data");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        // If user was signed in with Google, check if they're still signed in
        if (parsedUser.id?.startsWith("google-")) {
          const currentGoogleUser = await GoogleAuthService.getCurrentUser();
          if (!currentGoogleUser) {
            // Google session expired, clear local session
            console.log("Google session expired, clearing local session");
            await AsyncStorage.removeItem("@user_data");
            setUser(null);
          }
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
        // No API configured, use mock authentication but with strict admin checking
        const isAuthorizedAdmin = ENV_CONFIG.auth.authorizedAdmins.includes(
          email.toLowerCase()
        );

        if (!isAuthorizedAdmin) {
          throw new Error(
            `Unauthorized: ${email} is not authorized for administrative access.\n\nContact: info@masjidabubakr.org.uk`
          );
        }

        // Create authenticated user for authorized admin
        const mockUser: User = {
          id: "prod-" + Date.now(),
          email,
          name: email.split("@")[0],
          isAdmin: true, // Only authorized emails reach this point
        };

        await saveUser(mockUser);
        return;
      }

      // TODO: Implement actual API call for production
      // const response = await fetch(`${ENV_CONFIG.api.baseUrl}/auth/login`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ email, password }),
      // });
      //
      // if (!response.ok) {
      //   throw new Error('Login failed');
      // }
      //
      // const userData = await response.json();
      // await saveUser(userData);

      throw new Error("API authentication not yet implemented");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
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

      // Perform real Google Sign-In
      const googleUser = await GoogleAuthService.signIn();

      // Save the authenticated user
      await saveUser(googleUser);

      console.log("Google authentication successful:", {
        email: googleUser.email,
        name: googleUser.name,
        isAdmin: googleUser.isAdmin,
      });
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
      // If user was signed in with Google, sign out from Google too
      if (user?.id?.startsWith("google-")) {
        await GoogleAuthService.signOut();
      }

      // Clear local session
      await AsyncStorage.removeItem("@user_data");
      setUser(null);

      console.log("Logout successful");
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

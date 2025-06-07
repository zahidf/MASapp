import { User } from "@/types/prayer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, ReactNode, useEffect, useState } from "react";

// Development mode - set to false for production
const DEV_MODE = __DEV__; // This uses React Native's built-in __DEV__ flag

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  devLogin: () => Promise<void>; // Development only
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem("@user_data");
      if (userData) {
        setUser(JSON.parse(userData));
      } else if (DEV_MODE) {
        // Auto-login in development mode if no user data exists
        const devUser: User = {
          id: "dev-admin",
          email: "dev@admin.local",
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
    // Mock login for development
    // In production, this would call your authentication API

    if (DEV_MODE) {
      // In dev mode, any email/password combo works
      const isAdmin =
        email.toLowerCase().includes("admin") ||
        email.toLowerCase().includes("dev");

      const mockUser: User = {
        id: Date.now().toString(),
        email,
        name: email.split("@")[0],
        isAdmin,
      };

      await saveUser(mockUser);
      return;
    }

    // Production logic would go here
    // For now, still using mock logic
    const isAdmin = email.toLowerCase().includes("admin");

    const mockUser: User = {
      id: "1",
      email,
      name: email.split("@")[0],
      isAdmin,
    };

    await saveUser(mockUser);
  };

  const loginWithGoogle = async () => {
    // Mock Google login for development
    // In production, implement actual Google SSO

    const mockUser: User = {
      id: "google-" + Date.now(),
      email: DEV_MODE ? "dev.admin@gmail.com" : "admin@masjidabubakr.com",
      name: DEV_MODE ? "Dev Admin (Google)" : "Admin User",
      isAdmin: true,
    };

    await saveUser(mockUser);
  };

  const devLogin = async () => {
    if (!DEV_MODE) {
      throw new Error("Development login only available in development mode");
    }

    const devUser: User = {
      id: "dev-bypass",
      email: "bypass@dev.local",
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

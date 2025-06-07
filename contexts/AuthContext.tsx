import { User } from "@/types/prayer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, ReactNode, useEffect, useState } from "react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
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

    // For development, accept any email with 'admin' in it as admin
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

    // For now, simulate with a test admin user
    const mockUser: User = {
      id: "google-1",
      email: "admin@masjidabubakr.com",
      name: "Admin User",
      isAdmin: true,
    };

    await saveUser(mockUser);
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

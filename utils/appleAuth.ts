import { User } from "@/types/prayer";
import { ENV_CONFIG } from "@/utils/envConfig";
import { Platform } from "react-native";

// Import expo-apple-authentication
import * as AppleAuthentication from "expo-apple-authentication";

export class AppleAuthService {
  private static initialized = false;

  /**
   * Check if Apple Sign-In is available on this device
   */
  static async isAvailable(): Promise<boolean> {
    if (Platform.OS !== "ios") {
      return false;
    }

    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      return isAvailable;
    } catch (error) {
      console.error("Error checking Apple Sign-In availability:", error);
      return false;
    }
  }

  /**
   * Perform Apple Sign-In
   */
  static async signIn(): Promise<User> {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log("Apple Sign-In credential:", {
        user: credential.user,
        email: credential.email ? "***" : "Not provided",
        fullName: credential.fullName,
      });

      // Extract user information
      const userEmail = credential.email || `${credential.user}@privaterelay.appleid.com`;
      const userName = credential.fullName
        ? `${credential.fullName.givenName || ""} ${credential.fullName.familyName || ""}`.trim()
        : "Apple User";

      // Check if the user is authorized for admin access
      const isAuthorizedAdmin = ENV_CONFIG.auth.authorizedAdmins.includes(
        userEmail.toLowerCase()
      );

      // In production, only authorized admins can proceed
      if (!isAuthorizedAdmin && !ENV_CONFIG.isDevelopment) {
        throw new Error(
          `Unauthorised access: ${userEmail} is not authorised for administrative access.\n\nContact: info@masjidabubakr.org.uk`
        );
      }

      // Create user object
      const authenticatedUser: User = {
        id: `apple-${credential.user}`,
        email: userEmail,
        name: userName || userEmail.split("@")[0],
        isAdmin: isAuthorizedAdmin,
      };

      console.log("Apple Sign-In successful:", {
        email: authenticatedUser.email,
        name: authenticatedUser.name,
        isAdmin: authenticatedUser.isAdmin,
      });

      return authenticatedUser;
    } catch (error: any) {
      console.error("Apple Sign-In error:", error);

      if (error.code === "ERR_CANCELED") {
        throw new Error("Sign-in was cancelled");
      }

      throw error;
    }
  }

  /**
   * Get credential state for a user
   */
  static async getCredentialState(user: string): Promise<any> {
    try {
      const credentialState = await AppleAuthentication.getCredentialStateAsync(user);
      return credentialState;
    } catch (error) {
      console.error("Error getting credential state:", error);
      return null;
    }
  }

  /**
   * Mock Apple Sign-In for development
   */
  static async mockSignIn(): Promise<User> {
    console.log("🔧 Mock Apple Sign-In for development");

    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In development, create a mock admin user
    const mockUser: User = {
      id: "apple-dev-" + Date.now(),
      email: ENV_CONFIG.auth.devSettings.adminEmail,
      name: "Dev Admin (Mock Apple)",
      isAdmin: true,
    };

    console.log("🔧 Mock Apple Sign-In successful:", {
      email: mockUser.email,
      name: mockUser.name,
      isAdmin: mockUser.isAdmin,
    });

    return mockUser;
  }

  /**
   * Check if Apple Auth is properly configured
   */
  static isConfigured(): boolean {
    return Platform.OS === "ios";
  }

  /**
   * Get configuration status for debugging
   */
  static getConfigStatus() {
    return {
      platform: Platform.OS,
      hasModule: true, // expo-apple-authentication is always available
      isInitialized: this.initialized,
      isDevelopment: ENV_CONFIG.isDevelopment,
      authorizedAdmins: ENV_CONFIG.auth.authorizedAdmins,
    };
  }
}
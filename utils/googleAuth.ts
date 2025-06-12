import { User } from "@/types/prayer";
import { ENV_CONFIG } from "@/utils/envConfig";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

export class GoogleAuthService {
  private static initialized = false;

  /**
   * Initialize Google Sign-In configuration
   * Should be called once during app startup
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await GoogleSignin.configure({
        webClientId: ENV_CONFIG.auth.googleClientId.web,
        iosClientId: ENV_CONFIG.auth.googleClientId.ios,
        offlineAccess: true, // Enable to get refresh tokens
        hostedDomain: "", // Optional: restrict to specific domain (e.g., 'masjidabubakr.org.uk')
        forceCodeForRefreshToken: true,
        accountName: "", // Optional: specify account name
        googleServicePlistPath: "", // Optional: custom plist path
        openIdRealm: "", // Optional: OpenID realm
        profileImageSize: 120, // Optional: profile image size
      });

      this.initialized = true;
      console.log("Google Sign-In initialized successfully");
    } catch (error) {
      console.error("Google Sign-In initialization error:", error);
      throw new Error("Failed to initialize Google Sign-In");
    }
  }

  /**
   * Check if Google Play Services are available (Android)
   */
  static async checkPlayServices(): Promise<boolean> {
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      return true;
    } catch (error) {
      console.warn("Google Play Services not available:", error);
      return false;
    }
  }

  /**
   * Check if user is currently signed in with Google
   */
  static async getCurrentUser(): Promise<any | null> {
    try {
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (isSignedIn) {
        const userInfo = await GoogleSignin.getCurrentUser();
        return userInfo;
      }
      return null;
    } catch (error) {
      console.error("Error checking current Google user:", error);
      return null;
    }
  }

  /**
   * Perform Google Sign-In
   */
  static async signIn(): Promise<User> {
    try {
      // Initialize if not already done
      await this.initialize();

      // Check Play Services (Android only)
      const hasPlayServices = await this.checkPlayServices();
      if (!hasPlayServices) {
        throw new Error("Google Play Services are required for sign-in");
      }

      // Perform sign-in
      const userInfo = await GoogleSignin.signIn();

      if (!userInfo || !userInfo.user) {
        throw new Error("Failed to get user information from Google");
      }

      const { user } = userInfo;
      const userEmail = user.email;

      if (!userEmail) {
        throw new Error("No email address found in Google account");
      }

      // Check if the Google account email is authorized for admin access
      const isAuthorizedAdmin = ENV_CONFIG.auth.authorizedAdmins.includes(
        userEmail.toLowerCase()
      );

      // In production, only authorized admins can proceed
      if (!isAuthorizedAdmin && !ENV_CONFIG.isDevelopment) {
        // Sign out immediately if not authorized
        await this.signOut();
        throw new Error(
          `Unauthorized access: ${userEmail} is not authorized for administrative access.\n\nContact: info@masjidabubakr.org.uk`
        );
      }

      // Create user object
      const authenticatedUser: User = {
        id: `google-${user.id}`,
        email: userEmail,
        name: user.name || user.givenName || userEmail.split("@")[0],
        isAdmin: isAuthorizedAdmin,
      };

      console.log("Google Sign-In successful:", {
        email: authenticatedUser.email,
        name: authenticatedUser.name,
        isAdmin: authenticatedUser.isAdmin,
      });

      return authenticatedUser;
    } catch (error: any) {
      console.error("Google Sign-In error:", error);

      // Handle specific Google Sign-In error codes
      if (error.code) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            throw new Error("Google Sign-In was cancelled");
          case statusCodes.IN_PROGRESS:
            throw new Error("Google Sign-In is already in progress");
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            throw new Error("Google Play Services not available");
          default:
            throw new Error(`Google Sign-In failed: ${error.message}`);
        }
      }

      throw error;
    }
  }

  /**
   * Sign out from Google
   */
  static async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
      console.log("Google Sign-Out successful");
    } catch (error) {
      console.error("Google Sign-Out error:", error);
      // Don't throw here, as sign-out errors shouldn't prevent local logout
    }
  }

  /**
   * Revoke access (removes app from user's Google account)
   */
  static async revokeAccess(): Promise<void> {
    try {
      await GoogleSignin.revokeAccess();
      console.log("Google access revoked");
    } catch (error) {
      console.error("Google revoke access error:", error);
      throw error;
    }
  }

  /**
   * Get current user's tokens
   */
  static async getTokens(): Promise<any> {
    try {
      const tokens = await GoogleSignin.getTokens();
      return tokens;
    } catch (error) {
      console.error("Error getting Google tokens:", error);
      throw error;
    }
  }

  /**
   * Check if Google Auth is properly configured
   */
  static isConfigured(): boolean {
    return !!(
      ENV_CONFIG.auth.googleClientId.ios ||
      ENV_CONFIG.auth.googleClientId.android ||
      ENV_CONFIG.auth.googleClientId.web
    );
  }

  /**
   * Get configuration status for debugging
   */
  static getConfigStatus() {
    return {
      hasIosClientId: !!ENV_CONFIG.auth.googleClientId.ios,
      hasAndroidClientId: !!ENV_CONFIG.auth.googleClientId.android,
      hasWebClientId: !!ENV_CONFIG.auth.googleClientId.web,
      isInitialized: this.initialized,
      isDevelopment: ENV_CONFIG.isDevelopment,
      authorizedAdmins: ENV_CONFIG.auth.authorizedAdmins,
    };
  }
}

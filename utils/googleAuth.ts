import { User } from "@/types/prayer";
import { ENV_CONFIG } from "@/utils/envConfig";
import {
  GoogleSignin,
  User as GoogleSignInUser,
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
      GoogleSignin.configure({
        webClientId: ENV_CONFIG.auth.googleClientId.web,
        iosClientId: ENV_CONFIG.auth.googleClientId.ios,
        offlineAccess: true,
        forceCodeForRefreshToken: true,
        profileImageSize: 120,
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
      const hasPlayServices = await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      return hasPlayServices;
    } catch (error) {
      console.warn("Google Play Services not available:", error);
      return false;
    }
  }

  /**
   * Check if user is currently signed in with Google
   * In v14.x, use hasPreviousSignIn() instead of isSignedIn()
   */
  static async getCurrentUser(): Promise<GoogleSignInUser | null> {
    try {
      const currentUser = GoogleSignin.getCurrentUser();
      return currentUser;
    } catch (error) {
      console.error("Error checking current Google user:", error);
      return null;
    }
  }

  /**
   * Check if user has previously signed in
   * This is the correct method in v14.x (replaces isSignedIn)
   */
  static async hasPreviousSignIn(): Promise<boolean> {
    try {
      const hasPreviousSignIn = GoogleSignin.hasPreviousSignIn();
      return hasPreviousSignIn;
    } catch (error) {
      console.error("Error checking if user has previous sign in:", error);
      return false;
    }
  }

  /**
   * Try to sign in silently (for returning users)
   */
  static async signInSilently(): Promise<GoogleSignInUser | null> {
    try {
      const response = await GoogleSignin.signInSilently();
      // Handle the response structure properly
      if (response && "data" in response) {
        return response.data;
      }
      return response;
    } catch (error) {
      console.error("Silent sign-in failed:", error);
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
      const response = await GoogleSignin.signIn();

      let userInfo: GoogleSignInUser | null = null;

      // Handle different response structures
      if (response && "data" in response) {
        // Response has data property
        userInfo = response.data;
      } else {
        // Direct user info response
        userInfo = response as GoogleSignInUser;
      }

      if (!userInfo || !userInfo.user) {
        throw new Error("Failed to get user information from Google");
      }

      // Access user data from the response
      const user = userInfo.user;
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
          `Unauthorised access: ${userEmail} is not authorised for administrative access.\n\nContact: info@masjidabubakr.org.uk`
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

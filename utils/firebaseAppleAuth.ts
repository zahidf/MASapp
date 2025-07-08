import { auth } from "@/config/firebase";
import { User } from "@/types/prayer";
import { ENV_CONFIG } from "@/utils/envConfig";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  signOut as firebaseSignOut,
  User as FirebaseUser,
  OAuthProvider,
  onAuthStateChanged,
  signInWithCredential
} from "firebase/auth";
import { Platform } from "react-native";
import { debugLogger } from "./debugLogger";

export class FirebaseAppleAuthService {
  private static appleProvider = new OAuthProvider('apple.com');

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
      debugLogger.error("FIREBASE_APPLE_AUTH", "Error checking Apple Sign-In availability", error);
      return false;
    }
  }

  /**
   * Perform Apple Sign-In with Firebase
   */
  static async signIn(): Promise<User> {
    try {
      debugLogger.info("FIREBASE_APPLE_AUTH", "Starting Apple Sign-In flow");

      // Get Apple credential
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      debugLogger.debug("FIREBASE_APPLE_AUTH", "Apple credential received", {
        user: appleCredential.user,
        hasEmail: !!appleCredential.email,
        hasFullName: !!appleCredential.fullName,
      });

      // Create OAuth credential for Firebase
      const { identityToken, authorizationCode } = appleCredential;
      
      if (!identityToken) {
        throw new Error("No identity token received from Apple");
      }

      // Create Firebase credential
      const credential = this.appleProvider.credential({
        idToken: identityToken,
        rawNonce: authorizationCode || undefined // Convert null to undefined
      });

      // Sign in to Firebase
      const firebaseUserCredential = await signInWithCredential(auth, credential);
      const firebaseUser = firebaseUserCredential.user;

      debugLogger.info("FIREBASE_APPLE_AUTH", "Firebase sign-in successful", {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
      });

      // Extract user information
      const userEmail = firebaseUser.email || appleCredential.email || 
        `${appleCredential.user}@privaterelay.appleid.com`;
      
      const userName = appleCredential.fullName
        ? `${appleCredential.fullName.givenName || ""} ${appleCredential.fullName.familyName || ""}`.trim()
        : firebaseUser.displayName || "Apple User";

      // Check if the user is authorized for admin access
      const isAuthorizedAdmin = ENV_CONFIG.auth.authorizedAdmins.includes(
        userEmail.toLowerCase()
      );

      // Only authorized admins can proceed
      if (!isAuthorizedAdmin) {
        // Sign out from Firebase
        await firebaseSignOut(auth);
        throw new Error(
          `Access restricted to authorized administrators only.\n\nIf you believe you should have access, please contact the mosque administration at info@masjidabubakr.org.uk`
        );
      }

      // Create user object
      const authenticatedUser: User = {
        id: firebaseUser.uid, // Use Firebase UID
        email: userEmail,
        name: userName || userEmail.split("@")[0],
        isAdmin: isAuthorizedAdmin,
      };

      debugLogger.info("FIREBASE_APPLE_AUTH", "User authenticated successfully", {
        email: authenticatedUser.email,
        name: authenticatedUser.name,
        isAdmin: authenticatedUser.isAdmin,
      });

      return authenticatedUser;
    } catch (error: any) {
      debugLogger.error("FIREBASE_APPLE_AUTH", "Apple Sign-In error", error);

      if (error.code === "ERR_CANCELED") {
        throw new Error("Sign-in was cancelled");
      }

      throw error;
    }
  }

  /**
   * Get current Firebase user
   */
  static async getCurrentUser(): Promise<FirebaseUser | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  /**
   * Verify if a user is still authenticated
   */
  static async verifyUser(userId: string): Promise<User | null> {
    try {
      const currentUser = await this.getCurrentUser();
      
      if (!currentUser || currentUser.uid !== userId) {
        debugLogger.info("FIREBASE_APPLE_AUTH", "User verification failed", {
          hasCurrentUser: !!currentUser,
          expectedUserId: userId,
          actualUserId: currentUser?.uid,
        });
        return null;
      }

      const userEmail = currentUser.email || "";
      const isAuthorizedAdmin = ENV_CONFIG.auth.authorizedAdmins.includes(
        userEmail.toLowerCase()
      );

      // Verify admin status
      if (!isAuthorizedAdmin) {
        await firebaseSignOut(auth);
        return null;
      }

      return {
        id: currentUser.uid,
        email: userEmail,
        name: currentUser.displayName || userEmail.split("@")[0],
        isAdmin: isAuthorizedAdmin,
      };
    } catch (error) {
      debugLogger.error("FIREBASE_APPLE_AUTH", "Error verifying user", error);
      return null;
    }
  }

  /**
   * Sign out from Firebase
   */
  static async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
      debugLogger.info("FIREBASE_APPLE_AUTH", "Successfully signed out from Firebase");
    } catch (error) {
      debugLogger.error("FIREBASE_APPLE_AUTH", "Error signing out", error);
      throw error;
    }
  }

  /**
   * Mock Apple Sign-In for development
   */
  static async mockSignIn(): Promise<User> {
    debugLogger.info("FIREBASE_APPLE_AUTH", "Using mock Apple Sign-In for development");

    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In development, create a mock admin user
    const mockUser: User = {
      id: "firebase-apple-dev-" + Date.now(),
      email: ENV_CONFIG.auth.devSettings.adminEmail,
      name: "Dev Admin (Mock Firebase Apple)",
      isAdmin: true,
    };

    debugLogger.info("FIREBASE_APPLE_AUTH", "Mock sign-in successful", {
      email: mockUser.email,
      name: mockUser.name,
      isAdmin: mockUser.isAdmin,
    });

    return mockUser;
  }

  /**
   * Check if Firebase Apple Auth is properly configured
   */
  static isConfigured(): boolean {
    const hasFirebaseConfig = !!(
      ENV_CONFIG.auth.firebase.apiKey &&
      ENV_CONFIG.auth.firebase.authDomain &&
      ENV_CONFIG.auth.firebase.projectId
    );

    return Platform.OS === "ios" && hasFirebaseConfig;
  }

  /**
   * Get configuration status for debugging
   */
  static getConfigStatus() {
    return {
      platform: Platform.OS,
      hasFirebaseConfig: this.isConfigured(),
      isDevelopment: ENV_CONFIG.isDevelopment,
      authorizedAdmins: ENV_CONFIG.auth.authorizedAdmins,
    };
  }
}
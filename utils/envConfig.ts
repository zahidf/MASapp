/**
 * Environment Configuration Helper
 * Centralizes all environment variable access and provides type safety
 */

export interface AppConfig {
  // App Environment
  isDevelopment: boolean;
  isProduction: boolean;
  debugMode: boolean;
  appEnv: "development" | "staging" | "production";

  // Authentication
  auth: {
    googleClientId: {
      ios?: string;
      android?: string;
      web?: string;
    };
    firebase: {
      apiKey?: string;
      authDomain?: string;
      projectId?: string;
      storageBucket?: string;
      messagingSenderId?: string;
      appId?: string;
    };
    devSettings: {
      adminEmail: string;
      bypassAuth: boolean;
      testAdminEmail: string;
      testAdminPassword: string;
    };
    authorizedAdmins: string[];
  };

  // API Configuration
  api: {
    baseUrl?: string;
    adminUrl?: string;
    version: string;
  };

  // Mosque Information
  mosque: {
    name: string;
    address: string;
    phone: string;
    website: string;
    email: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };

  // Third-party Services
  services: {
    googleMapsApiKey?: string;
    expoProjectId?: string;
    analyticsId?: string;
    mixpanelToken?: string;
    sentryDsn?: string;
  };
}

// Parse coordinates from string format "lat,lng"
const parseCoordinates = (
  coordString?: string
): { latitude: number; longitude: number } => {
  if (!coordString) {
    // Default to Birmingham coordinates
    return { latitude: 52.4862, longitude: -1.8904 };
  }

  const [lat, lng] = coordString.split(",").map(Number);
  return {
    latitude: lat || 52.4862,
    longitude: lng || -1.8904,
  };
};

// Get authorized admin emails
const getAuthorizedAdmins = (): string[] => {
  // Only production authorized admins (no development admins)
  const productionAdmins = [
    "zahidfaqiri786@outlook.com", // Zahid Faqiri - Main Admin
  ];

  return productionAdmins;
};

// Create the configuration object
export const createAppConfig = (): AppConfig => {
  const appEnv =
    (process.env.EXPO_PUBLIC_APP_ENV as
      | "development"
      | "staging"
      | "production") || "development";
  const isDevelopment = __DEV__ || appEnv === "development";

  return {
    // App Environment
    isDevelopment,
    isProduction: appEnv === "production",
    debugMode: process.env.EXPO_PUBLIC_DEBUG_MODE === "true" || isDevelopment,
    appEnv,

    // Authentication
    auth: {
      googleClientId: {
        ios: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
        android: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
        web: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
      },
      firebase: {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      },
      devSettings: {
        adminEmail:
          process.env.EXPO_PUBLIC_DEV_ADMIN_EMAIL || "dev@admin.local",
        bypassAuth: process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === "true",
        testAdminEmail:
          process.env.EXPO_PUBLIC_TEST_ADMIN_EMAIL || "admin@test.local",
        testAdminPassword:
          process.env.EXPO_PUBLIC_TEST_ADMIN_PASSWORD || "testadmin123",
      },
      authorizedAdmins: getAuthorizedAdmins(),
    },

    // API Configuration
    api: {
      baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      adminUrl: process.env.EXPO_PUBLIC_ADMIN_API_URL,
      version: process.env.EXPO_PUBLIC_API_VERSION || "v1",
    },

    // Mosque Information
    mosque: {
      name: process.env.EXPO_PUBLIC_MOSQUE_NAME || "Masjid Abubakr Siddique",
      address:
        process.env.EXPO_PUBLIC_MOSQUE_ADDRESS ||
        "Grove St, Smethwick, Birmingham B66 2QS",
      phone: process.env.EXPO_PUBLIC_MOSQUE_PHONE || "+447973573059",
      website:
        process.env.EXPO_PUBLIC_MOSQUE_WEBSITE ||
        "https://www.masjidabubakr.org.uk",
      email:
        process.env.EXPO_PUBLIC_MOSQUE_EMAIL || "info@masjidabubakr.org.uk",
      coordinates: parseCoordinates(process.env.EXPO_PUBLIC_MOSQUE_COORDINATES),
    },

    // Third-party Services
    services: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      expoProjectId: process.env.EXPO_PUBLIC_EXPO_PROJECT_ID,
      analyticsId: process.env.EXPO_PUBLIC_GOOGLE_ANALYTICS_ID,
      mixpanelToken: process.env.EXPO_PUBLIC_MIXPANEL_TOKEN,
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    },
  };
};

// Export the configuration instance with explicit type
export const ENV_CONFIG: AppConfig = createAppConfig();

// Helper functions for common checks
export const isConfigured = {
  googleAuth: (): boolean =>
    !!(
      ENV_CONFIG.auth.googleClientId.ios ||
      ENV_CONFIG.auth.googleClientId.android
    ),
  firebase: (): boolean => !!ENV_CONFIG.auth.firebase.apiKey,
  api: (): boolean => !!ENV_CONFIG.api.baseUrl,
  googleMaps: (): boolean => !!ENV_CONFIG.services.googleMapsApiKey,
  analytics: (): boolean => !!ENV_CONFIG.services.analyticsId,
  sentry: (): boolean => !!ENV_CONFIG.services.sentryDsn,
};

// Configuration validation
export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check critical configurations for production
  if (ENV_CONFIG.isProduction) {
    if (!ENV_CONFIG.api.baseUrl) {
      errors.push("API base URL is required for production");
    }

    if (!ENV_CONFIG.services.expoProjectId) {
      errors.push("Expo Project ID is required for production");
    }

    if (!isConfigured.googleAuth()) {
      errors.push("Google OAuth configuration is required for production");
    }
  }

  // Check if development settings are accidentally enabled in production
  if (ENV_CONFIG.isProduction && ENV_CONFIG.auth.devSettings.bypassAuth) {
    errors.push("Development bypass auth should not be enabled in production");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Debug helper - only logs in development
export const logConfigStatus = (): void => {
  if (!ENV_CONFIG.debugMode) return;

  console.log("🔧 App Configuration Status:", {
    environment: ENV_CONFIG.appEnv,
    isDevelopment: ENV_CONFIG.isDevelopment,
    debugMode: ENV_CONFIG.debugMode,
    configured: {
      googleAuth: isConfigured.googleAuth(),
      firebase: isConfigured.firebase(),
      api: isConfigured.api(),
      googleMaps: isConfigured.googleMaps(),
      analytics: isConfigured.analytics(),
      sentry: isConfigured.sentry(),
    },
    validation: validateConfig(),
  });
};

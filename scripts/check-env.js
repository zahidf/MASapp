/**
 * Environment Check Script
 * Displays current environment configuration and status
 */

const fs = require("fs");
const path = require("path");

// Colors for console output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
};

const log = (message, color = "white") => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logSection = (title) => {
  console.log(
    `\n${colors.bright}${colors.cyan}━━━ ${title} ━━━${colors.reset}`
  );
};

// Load environment variables
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

const maskValue = (value, showLength = 4) => {
  if (!value) return "Not set";
  if (value.length <= showLength) return "*".repeat(value.length);
  return value.substring(0, showLength) + "*".repeat(value.length - showLength);
};

const getStatus = (value) => {
  if (!value || value.trim() === "") {
    return `${colors.red}❌ Not set${colors.reset}`;
  }
  return `${colors.green}✅ Set${colors.reset}`;
};

const main = () => {
  log(
    `${colors.bright}${colors.magenta}📋 MAS Prayer Times App - Environment Status${colors.reset}\n`
  );

  // App Environment
  logSection("App Environment");
  log(
    `Environment: ${process.env.EXPO_PUBLIC_APP_ENV || "development"}`,
    "cyan"
  );
  log(`Debug Mode: ${process.env.EXPO_PUBLIC_DEBUG_MODE || "false"}`, "cyan");
  log(
    `Dev Bypass Auth: ${process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH || "false"}`,
    "cyan"
  );

  // Authentication Configuration
  logSection("Authentication Configuration");
  console.log(
    `Google Client ID (iOS):     ${getStatus(
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS
    )}`
  );
  if (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS) {
    log(
      `  Value: ${maskValue(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS, 20)}`,
      "dim"
    );
  }

  console.log(
    `Google Client ID (Android): ${getStatus(
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID
    )}`
  );
  if (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID) {
    log(
      `  Value: ${maskValue(
        process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
        20
      )}`,
      "dim"
    );
  }

  console.log(
    `Google Client ID (Web):     ${getStatus(
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB
    )}`
  );
  if (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB) {
    log(
      `  Value: ${maskValue(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB, 20)}`,
      "dim"
    );
  }

  // Firebase Configuration
  logSection("Firebase Configuration");
  console.log(
    `Firebase API Key:      ${getStatus(
      process.env.EXPO_PUBLIC_FIREBASE_API_KEY
    )}`
  );
  console.log(
    `Firebase Auth Domain:  ${getStatus(
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
    )}`
  );
  console.log(
    `Firebase Project ID:   ${getStatus(
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
    )}`
  );
  console.log(
    `Firebase Storage:      ${getStatus(
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
    )}`
  );
  console.log(
    `Firebase Messaging:    ${getStatus(
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    )}`
  );
  console.log(
    `Firebase App ID:       ${getStatus(
      process.env.EXPO_PUBLIC_FIREBASE_APP_ID
    )}`
  );

  // API Configuration
  logSection("API Configuration");
  console.log(
    `API Base URL:    ${getStatus(process.env.EXPO_PUBLIC_API_BASE_URL)}`
  );
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    log(`  Value: ${process.env.EXPO_PUBLIC_API_BASE_URL}`, "dim");
  }

  console.log(
    `Admin API URL:   ${getStatus(process.env.EXPO_PUBLIC_ADMIN_API_URL)}`
  );
  if (process.env.EXPO_PUBLIC_ADMIN_API_URL) {
    log(`  Value: ${process.env.EXPO_PUBLIC_ADMIN_API_URL}`, "dim");
  }

  console.log(
    `API Version:     ${process.env.EXPO_PUBLIC_API_VERSION || "v1"}`,
    "cyan"
  );

  // Mosque Information
  logSection("Mosque Information");
  log(
    `Name: ${process.env.EXPO_PUBLIC_MOSQUE_NAME || "Masjid Abubakr Siddique"}`,
    "cyan"
  );
  log(
    `Address: ${
      process.env.EXPO_PUBLIC_MOSQUE_ADDRESS ||
      "Grove St, Smethwick, Birmingham B66 2QS"
    }`,
    "cyan"
  );
  log(
    `Phone: ${process.env.EXPO_PUBLIC_MOSQUE_PHONE || "+447973573059"}`,
    "cyan"
  );
  log(
    `Website: ${
      process.env.EXPO_PUBLIC_MOSQUE_WEBSITE ||
      "https://www.masjidabubakr.org.uk"
    }`,
    "cyan"
  );
  log(
    `Email: ${
      process.env.EXPO_PUBLIC_MOSQUE_EMAIL || "info@masjidabubakr.org.uk"
    }`,
    "cyan"
  );
  log(
    `Coordinates: ${
      process.env.EXPO_PUBLIC_MOSQUE_COORDINATES || "52.4953,-1.9658"
    }`,
    "cyan"
  );

  // Third-party Services
  logSection("Third-party Services");
  console.log(
    `Expo Project ID:      ${getStatus(
      process.env.EXPO_PUBLIC_EXPO_PROJECT_ID
    )}`
  );
  console.log(
    `Google Maps API Key:  ${getStatus(
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
    )}`
  );
  console.log(
    `Google Analytics ID:  ${getStatus(
      process.env.EXPO_PUBLIC_GOOGLE_ANALYTICS_ID
    )}`
  );
  console.log(
    `Mixpanel Token:       ${getStatus(process.env.EXPO_PUBLIC_MIXPANEL_TOKEN)}`
  );
  console.log(
    `Sentry DSN:           ${getStatus(process.env.EXPO_PUBLIC_SENTRY_DSN)}`
  );

  // Development Settings
  logSection("Development Settings");
  log(
    `Dev Admin Email: ${
      process.env.EXPO_PUBLIC_DEV_ADMIN_EMAIL || "dev@admin.local"
    }`,
    "cyan"
  );
  log(
    `Test Admin Email: ${
      process.env.EXPO_PUBLIC_TEST_ADMIN_EMAIL || "admin@test.local"
    }`,
    "cyan"
  );
  log(
    `Test Admin Password: ${maskValue(
      process.env.EXPO_PUBLIC_TEST_ADMIN_PASSWORD || "testadmin123"
    )}`,
    "cyan"
  );

  // Environment Files Status
  logSection("Environment Files");
  const envFiles = [
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
  ];
  envFiles.forEach((file) => {
    const exists = fs.existsSync(path.join(process.cwd(), file));
    const status = exists
      ? `${colors.green}✅ Exists${colors.reset}`
      : `${colors.red}❌ Missing${colors.reset}`;
    console.log(`${file.padEnd(20)} ${status}`);
  });

  // Configuration Summary
  logSection("Configuration Summary");

  const criticalVars = [
    "EXPO_PUBLIC_EXPO_PROJECT_ID",
    "EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS",
  ];

  const recommendedVars = [
    "EXPO_PUBLIC_FIREBASE_API_KEY",
    "EXPO_PUBLIC_API_BASE_URL",
    "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY",
  ];

  const criticalSet = criticalVars.filter((v) => process.env[v]).length;
  const recommendedSet = recommendedVars.filter((v) => process.env[v]).length;

  log(
    `Critical variables set: ${criticalSet}/${criticalVars.length}`,
    criticalSet === criticalVars.length ? "green" : "red"
  );
  log(
    `Recommended variables set: ${recommendedSet}/${recommendedVars.length}`,
    recommendedSet === recommendedVars.length ? "green" : "yellow"
  );

  const appEnv = process.env.EXPO_PUBLIC_APP_ENV;
  if (appEnv === "production") {
    log("✅ Ready for production deployment!", "green");
  } else if (appEnv === "staging") {
    log("⚠️  Configured for staging environment", "yellow");
  } else {
    log("🔧 Development environment detected", "cyan");
  }

  // Next Steps
  logSection("Next Steps");

  if (criticalSet < criticalVars.length) {
    log("❌ Configure missing critical variables before deployment", "red");
    log("   Run: cp .env.local.example .env.local", "dim");
    log("   Then edit .env.local with your actual values", "dim");
  } else if (recommendedSet < recommendedVars.length) {
    log(
      "⚠️  Consider configuring recommended variables for full functionality",
      "yellow"
    );
  } else {
    log("✅ Configuration looks good!", "green");
    log("   You can proceed with: npm run validate-config", "dim");
    log("   Then build with: npm run build:ios:prod", "dim");
  }

  console.log("");
};

// Run the check
main();

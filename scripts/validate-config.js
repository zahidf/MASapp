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
};

const log = (message, color = "white") => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logHeader = (message) => {
  console.log(
    `\n${colors.bright}${colors.cyan}=== ${message} ===${colors.reset}`
  );
};

const logSuccess = (message) => {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
};

const logWarning = (message) => {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
};

const logError = (message) => {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
};

// Load environment variables
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

// Required environment variables for production
const REQUIRED_PRODUCTION_VARS = [
  "EXPO_PUBLIC_EXPO_PROJECT_ID",
  "EXPO_PUBLIC_APP_ENV",
];

// Optional but recommended variables
const RECOMMENDED_VARS = [
  "EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS",
  "EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID",
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY",
];

// Files that should exist
const REQUIRED_FILES = [
  "app.json",
  "eas.json",
  "assets/images/icon.png",
  "assets/images/adaptive-icon.png",
  "assets/images/splash-icon.png",
  "assets/images/favicon.png",
];

// Validation functions
const validateEnvironmentVariables = () => {
  logHeader("Environment Variables Validation");

  let hasErrors = false;
  let hasWarnings = false;

  // Check required variables
  log("\nChecking required variables:", "bright");
  REQUIRED_PRODUCTION_VARS.forEach((varName) => {
    const value = process.env[varName];
    if (!value || value.trim() === "") {
      logError(`Missing required variable: ${varName}`);
      hasErrors = true;
    } else {
      logSuccess(`${varName}: ✓`);
    }
  });

  // Check recommended variables
  log("\nChecking recommended variables:", "bright");
  RECOMMENDED_VARS.forEach((varName) => {
    const value = process.env[varName];
    if (!value || value.trim() === "") {
      logWarning(`Missing recommended variable: ${varName}`);
      hasWarnings = true;
    } else {
      logSuccess(`${varName}: ✓`);
    }
  });

  // Check app environment
  const appEnv = process.env.EXPO_PUBLIC_APP_ENV;
  if (appEnv === "production") {
    logSuccess("App environment: production");
  } else {
    logWarning(
      `App environment: ${
        appEnv || "not set"
      } (should be 'production' for deployment)`
    );
    hasWarnings = true;
  }

  // Check debug mode
  const debugMode = process.env.EXPO_PUBLIC_DEBUG_MODE;
  if (debugMode === "true") {
    logWarning("Debug mode is enabled (should be false for production)");
    hasWarnings = true;
  } else {
    logSuccess("Debug mode: disabled");
  }

  // Check dev bypass
  const devBypass = process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH;
  if (devBypass === "true") {
    logError(
      "Development auth bypass is enabled (MUST be false for production)"
    );
    hasErrors = true;
  } else {
    logSuccess("Development auth bypass: disabled");
  }

  return { hasErrors, hasWarnings };
};

const validateFiles = () => {
  logHeader("Required Files Validation");

  let hasErrors = false;

  REQUIRED_FILES.forEach((filePath) => {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      logSuccess(`${filePath}: exists`);
    } else {
      logError(`Missing required file: ${filePath}`);
      hasErrors = true;
    }
  });

  return { hasErrors };
};

const validateAppJson = () => {
  logHeader("app.json Validation");

  let hasErrors = false;
  let hasWarnings = false;

  try {
    const appJsonPath = path.join(process.cwd(), "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
    const expo = appJson.expo;

    // Check required fields
    const requiredFields = ["name", "slug", "version", "icon"];
    requiredFields.forEach((field) => {
      if (!expo[field]) {
        logError(`Missing required field in app.json: expo.${field}`);
        hasErrors = true;
      } else {
        logSuccess(`expo.${field}: ✓`);
      }
    });

    // Check iOS bundle identifier
    if (!expo.ios?.bundleIdentifier) {
      logError("Missing iOS bundle identifier in app.json");
      hasErrors = true;
    } else {
      logSuccess(`iOS bundle identifier: ${expo.ios.bundleIdentifier}`);
    }

    // Check Android package
    if (!expo.android?.package) {
      logError("Missing Android package in app.json");
      hasErrors = true;
    } else {
      logSuccess(`Android package: ${expo.android.package}`);
    }

    // Check version format
    const version = expo.version;
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      logWarning(`Version format should be semantic (x.y.z): ${version}`);
      hasWarnings = true;
    }

    // Check privacy manifest for iOS
    if (!expo.ios?.privacyManifests) {
      logWarning(
        "iOS privacy manifest not configured (required for App Store)"
      );
      hasWarnings = true;
    } else {
      logSuccess("iOS privacy manifest: configured");
    }
  } catch (error) {
    logError(`Error reading app.json: ${error.message}`);
    hasErrors = true;
  }

  return { hasErrors, hasWarnings };
};

const validateEasJson = () => {
  logHeader("eas.json Validation");

  let hasErrors = false;
  let hasWarnings = false;

  try {
    const easJsonPath = path.join(process.cwd(), "eas.json");
    if (!fs.existsSync(easJsonPath)) {
      logError("eas.json file not found");
      return { hasErrors: true, hasWarnings: false };
    }

    const easJson = JSON.parse(fs.readFileSync(easJsonPath, "utf8"));

    // Check build profiles
    if (!easJson.build) {
      logError("Missing build configuration in eas.json");
      hasErrors = true;
    } else {
      const profiles = ["development", "preview", "production"];
      profiles.forEach((profile) => {
        if (easJson.build[profile]) {
          logSuccess(`Build profile '${profile}': configured`);
        } else {
          logWarning(`Build profile '${profile}': not configured`);
          hasWarnings = true;
        }
      });
    }

    // Check submit configuration
    if (!easJson.submit?.production) {
      logWarning(
        "Submit configuration not found (needed for automatic submission)"
      );
      hasWarnings = true;
    } else {
      logSuccess("Submit configuration: configured");
    }
  } catch (error) {
    logError(`Error reading eas.json: ${error.message}`);
    hasErrors = true;
  }

  return { hasErrors, hasWarnings };
};

const validateAssets = () => {
  logHeader("Asset Validation");

  let hasWarnings = false;

  const assetsDir = path.join(process.cwd(), "assets");
  const directories = ["images", "fonts"];

  directories.forEach((dir) => {
    const dirPath = path.join(assetsDir, dir);
    if (fs.existsSync(dirPath)) {
      logSuccess(`${dir} directory: exists`);

      // List files in directory
      const files = fs.readdirSync(dirPath);
      log(`  Files: ${files.join(", ")}`, "cyan");
    } else {
      logWarning(`${dir} directory: not found`);
      hasWarnings = true;
    }
  });

  return { hasWarnings };
};

// Main validation function
const main = () => {
  log(
    `${colors.bright}${colors.magenta}🔍 MAS Prayer Times App - Configuration Validation${colors.reset}\n`
  );

  let totalErrors = 0;
  let totalWarnings = 0;

  // Run all validations
  const envValidation = validateEnvironmentVariables();
  const filesValidation = validateFiles();
  const appJsonValidation = validateAppJson();
  const easJsonValidation = validateEasJson();
  const assetsValidation = validateAssets();

  // Collect results
  totalErrors += envValidation.hasErrors ? 1 : 0;
  totalErrors += filesValidation.hasErrors ? 1 : 0;
  totalErrors += appJsonValidation.hasErrors ? 1 : 0;
  totalErrors += easJsonValidation.hasErrors ? 1 : 0;

  totalWarnings += envValidation.hasWarnings ? 1 : 0;
  totalWarnings += appJsonValidation.hasWarnings ? 1 : 0;
  totalWarnings += easJsonValidation.hasWarnings ? 1 : 0;
  totalWarnings += assetsValidation.hasWarnings ? 1 : 0;

  // Summary
  logHeader("Validation Summary");

  if (totalErrors === 0 && totalWarnings === 0) {
    logSuccess("All validations passed! ✨");
    logSuccess("Your app is ready for deployment! 🚀");
  } else if (totalErrors === 0) {
    logWarning(
      `${totalWarnings} warning(s) found. Review and consider fixing before deployment.`
    );
    logSuccess("No critical errors found. App can be deployed. 📱");
  } else {
    logError(
      `${totalErrors} error(s) found that must be fixed before deployment.`
    );
    if (totalWarnings > 0) {
      logWarning(`${totalWarnings} warning(s) found.`);
    }
    logError("Please fix all errors before attempting deployment. ⛔");
  }

  // Exit with appropriate code
  process.exit(totalErrors > 0 ? 1 : 0);
};

// Run the validation
main();

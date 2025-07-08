import Constants from 'expo-constants';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';
import { getPerformance } from 'firebase/performance';

// Production Firebase configuration with validation
const getFirebaseConfig = () => {
  const config = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || Constants.expoConfig?.extra?.firebaseApiKey,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || Constants.expoConfig?.extra?.firebaseAuthDomain,
    databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || Constants.expoConfig?.extra?.firebaseDatabaseUrl,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || Constants.expoConfig?.extra?.firebaseProjectId,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || Constants.expoConfig?.extra?.firebaseStorageBucket,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || Constants.expoConfig?.extra?.firebaseMessagingSenderId,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || Constants.expoConfig?.extra?.firebaseAppId,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || Constants.expoConfig?.extra?.firebaseMeasurementId,
  };

  // Validate all required fields are present
  const requiredFields = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !config[field as keyof typeof config]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required Firebase configuration fields: ${missingFields.join(', ')}`);
  }

  return config;
};

// Initialize Firebase
let app: FirebaseApp;
try {
  const firebaseConfig = getFirebaseConfig();
  
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
  throw error;
}

// Initialize services
export const database = getDatabase(app);
export const auth = getAuth(app);

// Initialize Analytics (only in production and if supported)
export const initializeAnalytics = async () => {
  if (process.env.NODE_ENV === 'production' && await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};

// Initialize Performance Monitoring (only in production)
export const initializePerformance = () => {
  if (process.env.NODE_ENV === 'production') {
    return getPerformance(app);
  }
  return null;
};

// Enable offline persistence for Realtime Database
import { goOffline, goOnline } from 'firebase/database';

export const enableOfflinePersistence = () => {
  // Realtime Database persistence is enabled by default on mobile
  // This function is here for explicit control if needed
};

export const setDatabaseOnline = (online: boolean) => {
  if (online) {
    goOnline(database);
  } else {
    goOffline(database);
  }
};

// Connect to emulators in development
if (__DEV__ && process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST || 'localhost';
  
  try {
    connectDatabaseEmulator(database, emulatorHost, 9000);
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    console.log('Connected to Firebase emulators');
  } catch (error) {
    console.warn('Failed to connect to Firebase emulators:', error);
  }
}

export { app };

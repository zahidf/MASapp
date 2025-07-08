import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV_CONFIG } from '@/utils/envConfig';

// Firebase configuration
const firebaseConfig = {
  apiKey: ENV_CONFIG.auth.firebase.apiKey,
  authDomain: ENV_CONFIG.auth.firebase.authDomain,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: ENV_CONFIG.auth.firebase.projectId,
  storageBucket: ENV_CONFIG.auth.firebase.storageBucket,
  messagingSenderId: ENV_CONFIG.auth.firebase.messagingSenderId,
  appId: ENV_CONFIG.auth.firebase.appId,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app;
let auth: Auth;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  // Initialize Auth with AsyncStorage persistence for React Native
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} else {
  app = getApp();
  auth = getAuth(app);
}

// Initialize services
const database: Database = getDatabase(app);

export { database, auth };
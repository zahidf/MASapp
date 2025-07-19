import { ENV_CONFIG } from '@/utils/envConfig';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';

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
  // Firebase v11 handles persistence automatically in React Native
  // AsyncStorage warning can be safely ignored as auth state persists by default
  auth = getAuth(app);
} else {
  app = getApp();
  auth = getAuth(app);
}

// Initialize services
const database: Database = getDatabase(app);

export { auth, database };


const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// Script to initialize Firebase Realtime Database with prayer times data
// Run with: node scripts/initializeFirebase.js

// Function to load environment variables from .env.local
function loadEnvFile(envPath) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      // Skip empty lines and comments
      if (!line || line.trim().startsWith('#')) return;
      
      // Parse key=value pairs
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    });
  } catch (error) {
    console.error('❌ Error loading .env.local file:', error.message);
    process.exit(1);
  }
}

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
loadEnvFile(envPath);

// Validate that required environment variables are present
const requiredEnvVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_DATABASE_URL',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease ensure your .env.local file contains all required Firebase configuration.');
  process.exit(1);
}

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Parse CSV file
function parseCSVFile(filePath) {
  try {
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/ /g, '_'),
    });

    if (result.errors.length > 0) {
      console.error('CSV parsing errors:', result.errors);
      throw new Error('Failed to parse CSV file');
    }

    // Transform the data to match our PrayerTime interface
    const prayerTimes = result.data.map((row) => ({
      d_date: row.d_date || row.date,
      fajr_begins: row.fajr_begins || row.fajr_start || '',
      fajr_jamah: row.fajr_jamah || row.fajr_jamaah || '',
      sunrise: row.sunrise || '',
      zuhr_begins: row.zuhr_begins || row.zuhr_start || row.dhuhr_begins || '',
      zuhr_jamah: row.zuhr_jamah || row.zuhr_jamaah || row.dhuhr_jamah || '',
      asr_mithl_1: row.asr_mithl_1 || row.asr_start || '',
      asr_mithl_2: row.asr_mithl_2 || row.asr_start || '',
      asr_jamah: row.asr_jamah || row.asr_jamaah || '',
      maghrib_begins: row.maghrib_begins || row.maghrib_start || '',
      maghrib_jamah: row.maghrib_jamah || row.maghrib_jamaah || '',
      isha_begins: row.isha_begins || row.isha_start || '',
      isha_jamah: row.isha_jamah || row.isha_jamaah || '',
      is_ramadan: parseInt(row.is_ramadan || '0'),
      hijri_date: row.hijri_date || '',
    }));

    return prayerTimes;
  } catch (error) {
    console.error('Error reading CSV file:', error);
    throw error;
  }
}

// Main initialization function
async function initializeFirebaseDatabase() {
  console.log('🚀 Starting Firebase initialization...\n');

  try {
    // Initialize Firebase
    console.log('📱 Initializing Firebase app...');
    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);

    // Load prayer times from CSV
    const csvPath = path.join(process.cwd(), 'assets', 'mobilePrayerTimes.csv');
    console.log(`📂 Loading prayer times from: ${csvPath}`);
    
    const prayerTimes = parseCSVFile(csvPath);
    console.log(`✅ Loaded ${prayerTimes.length} prayer times from CSV\n`);

    // Convert array to object with date as key
    console.log('🔄 Transforming data for Firebase...');
    const prayerTimesObject = {};
    prayerTimes.forEach((prayerTime) => {
      prayerTimesObject[prayerTime.d_date] = prayerTime;
    });

    // Upload to Firebase
    console.log('📤 Uploading to Firebase Realtime Database...');
    const prayerTimesRef = ref(database, 'prayerTimes');
    
    await set(prayerTimesRef, prayerTimesObject);
    
    console.log('✅ Successfully uploaded prayer times to Firebase!\n');
    console.log('📊 Summary:');
    console.log(`   - Total entries: ${prayerTimes.length}`);
    console.log(`   - Date range: ${prayerTimes[0]?.d_date} to ${prayerTimes[prayerTimes.length - 1]?.d_date}`);
    console.log(`   - Database path: /prayerTimes`);
    console.log('\n🎉 Firebase initialization complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Check your Firebase Console to verify the data');
    console.log('   2. Update your app to use the firebasePrayerTimesUpdated service');
    console.log('   3. Test real-time synchronization');
    
  } catch (error) {
    console.error('\n❌ Error initializing Firebase:', error);
    if (error.code === 'PERMISSION_DENIED') {
      console.error('\n🔐 Permission denied! Please check:');
      console.error('   1. Firebase Realtime Database rules');
      console.error('   2. Authentication settings');
      console.error('   3. Enable anonymous authentication in Firebase Console');
    }
    process.exit(1);
  }
}

// Run the initialization
initializeFirebaseDatabase();
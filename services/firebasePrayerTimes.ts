import {
  ref,
  set,
  get,
  onValue,
  off,
  push,
  remove,
  DatabaseReference,
  DataSnapshot,
  Query,
  orderByChild,
  equalTo,
  query,
  startAt,
  endAt,
  limitToFirst,
  limitToLast,
} from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { database, auth } from '@/config/firebase';
import { PrayerTime } from '@/types/prayer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  validatePrayerTime, 
  validatePrayerTimesArray, 
  sanitizePrayerTime,
  removeDuplicatePrayerTimes,
  findDuplicateDates 
} from '@/utils/prayerTimeValidation';

const PRAYER_TIMES_PATH = 'prayerTimes';
const CACHE_KEY = 'firebase_prayer_times_cache';
const CACHE_TIMESTAMP_KEY = 'firebase_prayer_times_cache_timestamp';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

export class FirebasePrayerTimesService {
  private static instance: FirebasePrayerTimesService;
  private prayerTimesRef: DatabaseReference;
  private listeners: Map<string, (snapshot: DataSnapshot) => void> = new Map();
  private isInitialized = false;
  private authUser: User | null = null;
  private isOnline = true;

  private constructor() {
    this.prayerTimesRef = ref(database, PRAYER_TIMES_PATH);
    this.initializeAuth();
    this.setupConnectionMonitoring();
  }

  static getInstance(): FirebasePrayerTimesService {
    if (!FirebasePrayerTimesService.instance) {
      FirebasePrayerTimesService.instance = new FirebasePrayerTimesService();
    }
    return FirebasePrayerTimesService.instance;
  }

  // Initialize Firebase Authentication
  private async initializeAuth(): Promise<void> {
    try {
      // Listen for auth state changes
      onAuthStateChanged(auth, (user) => {
        this.authUser = user;
      });

      // Sign in anonymously if not already authenticated
      if (!auth.currentUser) {
        const userCredential = await signInAnonymously(auth);
        this.authUser = userCredential.user;
      }

      this.isInitialized = true;
    } catch (error) {
      // Continue without authentication for read operations
      this.isInitialized = true;
    }
  }

  // Setup connection monitoring
  private setupConnectionMonitoring(): void {
    const connectedRef = ref(database, '.info/connected');
    
    onValue(connectedRef, (snapshot) => {
      this.isOnline = snapshot.val() === true;
    });
  }

  // Ensure authentication before operations
  private async ensureAuthenticated(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeAuth();
    }

    // Wait a bit for auth to complete if needed
    if (!this.authUser) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Create or update prayer times
  async setPrayerTimes(prayerTimes: PrayerTime[]): Promise<void> {
    await this.ensureAuthenticated();
    
    try {
      // Validate data before saving
      if (!prayerTimes || prayerTimes.length === 0) {
        throw new Error('Cannot save empty prayer times data');
      }

      // Validate and sanitize prayer times
      const validatedPrayerTimes = validatePrayerTimesArray(prayerTimes);
      if (validatedPrayerTimes.length === 0) {
        throw new Error('No valid prayer times found after validation');
      }

      // Check for duplicates
      const duplicates = findDuplicateDates(validatedPrayerTimes);
      if (duplicates.length > 0) {
        const uniquePrayerTimes = removeDuplicatePrayerTimes(validatedPrayerTimes);
        validatedPrayerTimes.length = 0;
        validatedPrayerTimes.push(...uniquePrayerTimes);
      }

      // Convert array to object with date as key for efficient lookups
      const prayerTimesObject: { [key: string]: PrayerTime } = {};
      validatedPrayerTimes.forEach((prayerTime) => {
        prayerTimesObject[prayerTime.d_date] = prayerTime;
      });

      await set(this.prayerTimesRef, prayerTimesObject);
      
      // Update local cache
      await this.updateCache(validatedPrayerTimes);
    } catch (error) {
      throw error;
    }
  }

  // Get all prayer times with improved error handling
  async getAllPrayerTimes(): Promise<PrayerTime[]> {
    // Try cache first for better performance
    const cachedData = await this.getFromCache();
    if (cachedData && cachedData.length > 0) {
      // Fetch fresh data in background
      this.fetchAndUpdateCache().catch(error => {
        // Silent error
      });
      
      return cachedData;
    }

    // If no cache, fetch from Firebase
    return this.fetchFromFirebase();
  }

  // Fetch data from Firebase
  private async fetchFromFirebase(): Promise<PrayerTime[]> {
    await this.ensureAuthenticated();
    
    try {
      const snapshot = await get(this.prayerTimesRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const prayerTimes = Object.values(data) as PrayerTime[];
        
        // Update cache
        await this.updateCache(prayerTimes);
        
        return prayerTimes.sort((a, b) => 
          new Date(a.d_date).getTime() - new Date(b.d_date).getTime()
        );
      }
      
      return [];
    } catch (error) {
      // Try stale cache as last resort
      const staleCache = await this.getFromCache(true);
      if (staleCache && staleCache.length > 0) {
        return staleCache;
      }
      
      throw error;
    }
  }

  // Background fetch and cache update
  private async fetchAndUpdateCache(): Promise<void> {
    try {
      const freshData = await this.fetchFromFirebase();
      if (freshData && freshData.length > 0) {
        await this.updateCache(freshData);
      }
    } catch (error) {
      // Silent fail for background operations
    }
  }

  // Get prayer times for a specific date
  async getPrayerTimeByDate(date: string): Promise<PrayerTime | null> {
    // Check cache first
    const cachedData = await this.getFromCache();
    if (cachedData) {
      const cachedPrayerTime = cachedData.find(pt => pt.d_date === date);
      if (cachedPrayerTime) {
        return cachedPrayerTime;
      }
    }

    await this.ensureAuthenticated();
    
    try {
      const dateRef = ref(database, `${PRAYER_TIMES_PATH}/${date}`);
      const snapshot = await get(dateRef);
      
      if (snapshot.exists()) {
        const prayerTime = snapshot.val() as PrayerTime;
        return prayerTime;
      }
      
      return null;
    } catch (error) {
      throw error;
    }
  }

  // Get prayer times for a date range
  async getPrayerTimesByDateRange(startDate: string, endDate: string): Promise<PrayerTime[]> {
    await this.ensureAuthenticated();
    
    try {
      const prayerTimesQuery = query(
        this.prayerTimesRef,
        orderByChild('d_date'),
        startAt(startDate),
        endAt(endDate)
      );
      
      const snapshot = await get(prayerTimesQuery);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const prayerTimes = Object.values(data) as PrayerTime[];
        const sorted = prayerTimes.sort((a, b) => 
          new Date(a.d_date).getTime() - new Date(b.d_date).getTime()
        );
        
        return sorted;
      }
      
      return [];
    } catch (error) {
      throw error;
    }
  }

  // Get prayer times for a specific month
  async getPrayerTimesByMonth(year: number, month: number): Promise<PrayerTime[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    return this.getPrayerTimesByDateRange(startDate, endDate);
  }

  // Update a single prayer time
  async updatePrayerTime(date: string, prayerTime: Partial<PrayerTime>): Promise<void> {
    await this.ensureAuthenticated();
    
    try {
      const dateRef = ref(database, `${PRAYER_TIMES_PATH}/${date}`);
      const snapshot = await get(dateRef);
      
      if (snapshot.exists()) {
        const currentData = snapshot.val();
        const updatedData = { ...currentData, ...prayerTime };
        
        await set(dateRef, updatedData);
        
        // Invalidate cache
        await this.invalidateCache();
      } else {
        const error = new Error(`Prayer time for date ${date} not found`);
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  // Delete prayer times for a specific date
  async deletePrayerTime(date: string): Promise<void> {
    await this.ensureAuthenticated();
    
    try {
      const dateRef = ref(database, `${PRAYER_TIMES_PATH}/${date}`);
      await remove(dateRef);
      
      // Invalidate cache
      await this.invalidateCache();
    } catch (error) {
      throw error;
    }
  }

  // Subscribe to real-time updates
  subscribeToUpdates(callback: (prayerTimes: PrayerTime[]) => void): () => void {
    const listenerId = Date.now().toString();

    const listener = (snapshot: DataSnapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const prayerTimes = Object.values(data) as PrayerTime[];
          const sortedPrayerTimes = prayerTimes.sort((a, b) => 
            new Date(a.d_date).getTime() - new Date(b.d_date).getTime()
          );
          
          // Update cache on real-time updates
          this.updateCache(sortedPrayerTimes);
          
          callback(sortedPrayerTimes);
        } else {
          callback([]);
        }
      } catch (error) {
        // Error processing real-time update
      }
    };

    // Store the listener
    this.listeners.set(listenerId, listener);
    
    // Start listening
    onValue(this.prayerTimesRef, listener);

    // Return unsubscribe function
    return () => {
      off(this.prayerTimesRef, 'value', listener);
      this.listeners.delete(listenerId);
    };
  }

  // Subscribe to updates for a specific date
  subscribeToDateUpdates(date: string, callback: (prayerTime: PrayerTime | null) => void): () => void {
    const dateRef = ref(database, `${PRAYER_TIMES_PATH}/${date}`);
    
    const listener = (snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as PrayerTime);
      } else {
        callback(null);
      }
    };

    onValue(dateRef, listener);

    return () => {
      off(dateRef, 'value', listener);
    };
  }

  // Cache management methods
  private async updateCache(prayerTimes: PrayerTime[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(prayerTimes));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      // Error updating cache
    }
  }

  private async getFromCache(ignoreExpiry = false): Promise<PrayerTime[] | null> {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      const cacheTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedData && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp);
        const age = Date.now() - timestamp;
        const isExpired = age > CACHE_DURATION;
        
        if (!isExpired || ignoreExpiry) {
          const data = JSON.parse(cachedData) as PrayerTime[];
          return data;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private async invalidateCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
    } catch (error) {
      // Error invalidating cache
    }
  }

  // Batch operations for efficiency
  async batchUpdatePrayerTimes(updates: { [date: string]: Partial<PrayerTime> }): Promise<void> {
    await this.ensureAuthenticated();
    
    try {
      const updatePromises = Object.entries(updates).map(([date, update]) => 
        this.updatePrayerTime(date, update)
      );
      
      await Promise.all(updatePromises);
    } catch (error) {
      throw error;
    }
  }

  // Check if Firebase is connected
  async isConnected(): Promise<boolean> {
    try {
      const connectedRef = ref(database, '.info/connected');
      const snapshot = await get(connectedRef);
      const isConnected = snapshot.val() === true;
      
      return isConnected;
    } catch (error) {
      return false;
    }
  }

  // Monitor connection status
  monitorConnectionStatus(callback: (isConnected: boolean) => void): () => void {
    const connectedRef = ref(database, '.info/connected');
    
    const listener = (snapshot: DataSnapshot) => {
      const isConnected = snapshot.val() === true;
      callback(isConnected);
    };

    onValue(connectedRef, listener);

    return () => {
      off(connectedRef, 'value', listener);
    };
  }
}

// Export singleton instance
export const firebasePrayerTimesService = FirebasePrayerTimesService.getInstance();
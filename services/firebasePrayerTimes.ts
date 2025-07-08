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
import { firebaseLogger, LogCategory, logFirebaseOperation } from '@/utils/firebaseLogger';
import { retryWithBackoff, retryWithAuth, CircuitBreaker } from '@/utils/firebaseRetry';
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
  private circuitBreaker: CircuitBreaker;
  private isOnline = true;

  private constructor() {
    this.prayerTimesRef = ref(database, PRAYER_TIMES_PATH);
    this.circuitBreaker = new CircuitBreaker();
    this.initializeAuth();
    this.setupConnectionMonitoring();
    
    firebaseLogger.info(
      LogCategory.PRAYER_TIMES,
      'FirebasePrayerTimesService',
      'Service initialized',
      { path: PRAYER_TIMES_PATH }
    );
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
      firebaseLogger.debug(
        LogCategory.AUTH,
        'initializeAuth',
        'Initializing Firebase authentication'
      );

      // Listen for auth state changes
      onAuthStateChanged(auth, (user) => {
        this.authUser = user;
        if (user) {
          firebaseLogger.info(
            LogCategory.AUTH,
            'initializeAuth',
            'User authenticated',
            { uid: user.uid, isAnonymous: user.isAnonymous }
          );
        } else {
          firebaseLogger.info(
            LogCategory.AUTH,
            'initializeAuth',
            'User not authenticated'
          );
        }
      });

      // Sign in anonymously if not already authenticated
      if (!auth.currentUser) {
        const userCredential = await signInAnonymously(auth);
        this.authUser = userCredential.user;
        
        firebaseLogger.info(
          LogCategory.AUTH,
          'initializeAuth',
          'Successfully signed in anonymously',
          { uid: userCredential.user.uid }
        );
      }

      this.isInitialized = true;
    } catch (error) {
      firebaseLogger.error(
        LogCategory.AUTH,
        'initializeAuth',
        'Failed to initialize authentication',
        error
      );
      
      // Continue without authentication for read operations
      this.isInitialized = true;
    }
  }

  // Setup connection monitoring
  private setupConnectionMonitoring(): void {
    const connectedRef = ref(database, '.info/connected');
    
    onValue(connectedRef, (snapshot) => {
      this.isOnline = snapshot.val() === true;
      
      firebaseLogger.info(
        LogCategory.NETWORK,
        'setupConnectionMonitoring',
        `Connection status: ${this.isOnline ? 'Online' : 'Offline'}`
      );
      
      // Reset circuit breaker when coming back online
      if (this.isOnline) {
        this.circuitBreaker.reset();
      }
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
    
    return logFirebaseOperation(
      LogCategory.PRAYER_TIMES,
      'setPrayerTimes',
      async () => {
        firebaseLogger.debug(
          LogCategory.PRAYER_TIMES,
          'setPrayerTimes',
          `Setting ${prayerTimes.length} prayer times`,
          { count: prayerTimes.length, firstDate: prayerTimes[0]?.d_date, lastDate: prayerTimes[prayerTimes.length - 1]?.d_date }
        );

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
          firebaseLogger.warn(
            LogCategory.PRAYER_TIMES,
            'setPrayerTimes',
            `Found ${duplicates.length} duplicate dates, removing duplicates`
          );
          const uniquePrayerTimes = removeDuplicatePrayerTimes(validatedPrayerTimes);
          validatedPrayerTimes.length = 0;
          validatedPrayerTimes.push(...uniquePrayerTimes);
        }

        // Convert array to object with date as key for efficient lookups
        const prayerTimesObject: { [key: string]: PrayerTime } = {};
        validatedPrayerTimes.forEach((prayerTime) => {
          prayerTimesObject[prayerTime.d_date] = prayerTime;
        });

        // Use retry logic with circuit breaker
        await this.circuitBreaker.execute(
          () => retryWithAuth(
            async () => {
              const perfId = firebaseLogger.startPerformanceTracking('firebase_set_prayer_times');
              await set(this.prayerTimesRef, prayerTimesObject);
              firebaseLogger.endPerformanceTracking(perfId, true, { count: validatedPrayerTimes.length });
            },
            'setPrayerTimes',
            auth
          ),
          'setPrayerTimes'
        );
        
        // Update local cache
        await this.updateCache(validatedPrayerTimes);
        
        firebaseLogger.info(
          LogCategory.PRAYER_TIMES,
          'setPrayerTimes',
          'Successfully set prayer times',
          { count: validatedPrayerTimes.length }
        );
      }
    );
  }

  // Get all prayer times with improved error handling
  async getAllPrayerTimes(): Promise<PrayerTime[]> {
    // Try cache first for better performance
    const cachedData = await this.getFromCache();
    if (cachedData && cachedData.length > 0) {
      firebaseLogger.debug(
        LogCategory.CACHE,
        'getAllPrayerTimes',
        'Returning cached data',
        { count: cachedData.length }
      );
      
      // Fetch fresh data in background
      this.fetchAndUpdateCache().catch(error => {
        firebaseLogger.warn(
          LogCategory.PRAYER_TIMES,
          'getAllPrayerTimes',
          'Background fetch failed',
          error
        );
      });
      
      return cachedData;
    }

    // If no cache, fetch from Firebase
    return this.fetchFromFirebase();
  }

  // Fetch data from Firebase
  private async fetchFromFirebase(): Promise<PrayerTime[]> {
    await this.ensureAuthenticated();
    
    return logFirebaseOperation(
      LogCategory.PRAYER_TIMES,
      'fetchFromFirebase',
      async () => {
        firebaseLogger.debug(
          LogCategory.PRAYER_TIMES,
          'fetchFromFirebase',
          'Fetching from Firebase'
        );

        const perfId = firebaseLogger.startPerformanceTracking('firebase_get_all_prayer_times');
        
        try {
          const snapshot = await get(this.prayerTimesRef);
          firebaseLogger.endPerformanceTracking(perfId, true);

          if (snapshot.exists()) {
            const data = snapshot.val();
            const prayerTimes = Object.values(data) as PrayerTime[];
            
            firebaseLogger.info(
              LogCategory.PRAYER_TIMES,
              'fetchFromFirebase',
              `Retrieved ${prayerTimes.length} prayer times from Firebase`,
              { count: prayerTimes.length }
            );
            
            // Update cache
            await this.updateCache(prayerTimes);
            
            return prayerTimes.sort((a, b) => 
              new Date(a.d_date).getTime() - new Date(b.d_date).getTime()
            );
          }
          
          firebaseLogger.warn(
            LogCategory.PRAYER_TIMES,
            'fetchFromFirebase',
            'No prayer times found in database'
          );
          return [];
        } catch (error) {
          firebaseLogger.endPerformanceTracking(perfId, false);
          throw error;
        }
      }
    ).catch(async (error) => {
      firebaseLogger.error(
        LogCategory.PRAYER_TIMES,
        'fetchFromFirebase',
        'Error fetching from Firebase',
        error
      );
      
      // Try stale cache as last resort
      const staleCache = await this.getFromCache(true);
      if (staleCache && staleCache.length > 0) {
        firebaseLogger.info(
          LogCategory.CACHE,
          'fetchFromFirebase',
          'Using stale cache due to Firebase error',
          { count: staleCache.length }
        );
        return staleCache;
      }
      
      throw error;
    });
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
      firebaseLogger.debug(
        LogCategory.CACHE,
        'fetchAndUpdateCache',
        'Background cache update failed',
        error
      );
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
    
    return logFirebaseOperation(
      LogCategory.PRAYER_TIMES,
      'getPrayerTimeByDate',
      async () => {
        firebaseLogger.debug(
          LogCategory.PRAYER_TIMES,
          'getPrayerTimeByDate',
          `Fetching prayer time for date: ${date}`
        );

        const dateRef = ref(database, `${PRAYER_TIMES_PATH}/${date}`);
        const perfId = firebaseLogger.startPerformanceTracking('firebase_get_prayer_time_by_date');
        const snapshot = await get(dateRef);
        firebaseLogger.endPerformanceTracking(perfId, true);
        
        if (snapshot.exists()) {
          const prayerTime = snapshot.val() as PrayerTime;
          firebaseLogger.info(
            LogCategory.PRAYER_TIMES,
            'getPrayerTimeByDate',
            `Found prayer time for ${date}`,
            { date }
          );
          return prayerTime;
        }
        
        firebaseLogger.warn(
          LogCategory.PRAYER_TIMES,
          'getPrayerTimeByDate',
          `No prayer time found for ${date}`
        );
        return null;
      }
    );
  }

  // Get prayer times for a date range
  async getPrayerTimesByDateRange(startDate: string, endDate: string): Promise<PrayerTime[]> {
    await this.ensureAuthenticated();
    
    return logFirebaseOperation(
      LogCategory.PRAYER_TIMES,
      'getPrayerTimesByDateRange',
      async () => {
        firebaseLogger.debug(
          LogCategory.PRAYER_TIMES,
          'getPrayerTimesByDateRange',
          `Fetching prayer times from ${startDate} to ${endDate}`
        );

        const prayerTimesQuery = query(
          this.prayerTimesRef,
          orderByChild('d_date'),
          startAt(startDate),
          endAt(endDate)
        );
        
        const perfId = firebaseLogger.startPerformanceTracking('firebase_get_prayer_times_range');
        const snapshot = await get(prayerTimesQuery);
        firebaseLogger.endPerformanceTracking(perfId, true);

        if (snapshot.exists()) {
          const data = snapshot.val();
          const prayerTimes = Object.values(data) as PrayerTime[];
          const sorted = prayerTimes.sort((a, b) => 
            new Date(a.d_date).getTime() - new Date(b.d_date).getTime()
          );
          
          firebaseLogger.info(
            LogCategory.PRAYER_TIMES,
            'getPrayerTimesByDateRange',
            `Retrieved ${sorted.length} prayer times for range`,
            { startDate, endDate, count: sorted.length }
          );
          
          return sorted;
        }
        
        firebaseLogger.warn(
          LogCategory.PRAYER_TIMES,
          'getPrayerTimesByDateRange',
          `No prayer times found for range ${startDate} to ${endDate}`
        );
        return [];
      }
    );
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
    
    return logFirebaseOperation(
      LogCategory.PRAYER_TIMES,
      'updatePrayerTime',
      async () => {
        firebaseLogger.debug(
          LogCategory.PRAYER_TIMES,
          'updatePrayerTime',
          `Updating prayer time for ${date}`,
          { date, updates: prayerTime }
        );

        const dateRef = ref(database, `${PRAYER_TIMES_PATH}/${date}`);
        const snapshot = await get(dateRef);
        
        if (snapshot.exists()) {
          const currentData = snapshot.val();
          const updatedData = { ...currentData, ...prayerTime };
          
          const perfId = firebaseLogger.startPerformanceTracking('firebase_update_prayer_time');
          await set(dateRef, updatedData);
          firebaseLogger.endPerformanceTracking(perfId, true);
          
          firebaseLogger.info(
            LogCategory.PRAYER_TIMES,
            'updatePrayerTime',
            `Successfully updated prayer time for ${date}`,
            { date, updatedFields: Object.keys(prayerTime) }
          );
          
          // Invalidate cache
          await this.invalidateCache();
        } else {
          const error = new Error(`Prayer time for date ${date} not found`);
          firebaseLogger.error(
            LogCategory.PRAYER_TIMES,
            'updatePrayerTime',
            error.message,
            error,
            { date }
          );
          throw error;
        }
      }
    );
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
      console.error('Error deleting prayer time:', error);
      throw error;
    }
  }

  // Subscribe to real-time updates
  subscribeToUpdates(callback: (prayerTimes: PrayerTime[]) => void): () => void {
    const listenerId = Date.now().toString();
    
    firebaseLogger.debug(
      LogCategory.DATABASE,
      'subscribeToUpdates',
      'Setting up real-time listener',
      { listenerId }
    );

    const listener = (snapshot: DataSnapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const prayerTimes = Object.values(data) as PrayerTime[];
          const sortedPrayerTimes = prayerTimes.sort((a, b) => 
            new Date(a.d_date).getTime() - new Date(b.d_date).getTime()
          );
          
          firebaseLogger.debug(
            LogCategory.DATABASE,
            'subscribeToUpdates',
            `Received real-time update with ${sortedPrayerTimes.length} prayer times`,
            { listenerId, count: sortedPrayerTimes.length }
          );
          
          // Update cache on real-time updates
          this.updateCache(sortedPrayerTimes);
          
          callback(sortedPrayerTimes);
        } else {
          firebaseLogger.warn(
            LogCategory.DATABASE,
            'subscribeToUpdates',
            'Received empty snapshot',
            { listenerId }
          );
          callback([]);
        }
      } catch (error) {
        firebaseLogger.error(
          LogCategory.DATABASE,
          'subscribeToUpdates',
          'Error processing real-time update',
          error,
          { listenerId }
        );
      }
    };

    // Store the listener
    this.listeners.set(listenerId, listener);
    
    // Start listening
    onValue(this.prayerTimesRef, listener);

    firebaseLogger.info(
      LogCategory.DATABASE,
      'subscribeToUpdates',
      'Real-time listener activated',
      { listenerId, totalListeners: this.listeners.size }
    );

    // Return unsubscribe function
    return () => {
      off(this.prayerTimesRef, 'value', listener);
      this.listeners.delete(listenerId);
      
      firebaseLogger.info(
        LogCategory.DATABASE,
        'subscribeToUpdates',
        'Real-time listener removed',
        { listenerId, remainingListeners: this.listeners.size }
      );
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
    const perfId = firebaseLogger.startPerformanceTracking('cache_update');
    try {
      firebaseLogger.debug(
        LogCategory.CACHE,
        'updateCache',
        `Updating cache with ${prayerTimes.length} prayer times`
      );

      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(prayerTimes));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      
      firebaseLogger.endPerformanceTracking(perfId, true);
      firebaseLogger.info(
        LogCategory.CACHE,
        'updateCache',
        'Cache updated successfully',
        { count: prayerTimes.length }
      );
    } catch (error) {
      firebaseLogger.endPerformanceTracking(perfId, false);
      firebaseLogger.error(
        LogCategory.CACHE,
        'updateCache',
        'Failed to update cache',
        error
      );
    }
  }

  private async getFromCache(ignoreExpiry = false): Promise<PrayerTime[] | null> {
    const perfId = firebaseLogger.startPerformanceTracking('cache_read');
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      const cacheTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedData && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp);
        const age = Date.now() - timestamp;
        const isExpired = age > CACHE_DURATION;
        
        if (!isExpired || ignoreExpiry) {
          const data = JSON.parse(cachedData) as PrayerTime[];
          firebaseLogger.endPerformanceTracking(perfId, true);
          
          firebaseLogger.debug(
            LogCategory.CACHE,
            'getFromCache',
            `Cache hit - returning ${data.length} prayer times`,
            { 
              count: data.length,
              cacheAge: Math.round(age / 1000),
              ignoreExpiry,
              isExpired
            }
          );
          
          return data;
        } else {
          firebaseLogger.debug(
            LogCategory.CACHE,
            'getFromCache',
            'Cache expired',
            { cacheAge: Math.round(age / 1000) }
          );
        }
      } else {
        firebaseLogger.debug(
          LogCategory.CACHE,
          'getFromCache',
          'Cache miss - no data found'
        );
      }
      
      firebaseLogger.endPerformanceTracking(perfId, true);
      return null;
    } catch (error) {
      firebaseLogger.endPerformanceTracking(perfId, false);
      firebaseLogger.error(
        LogCategory.CACHE,
        'getFromCache',
        'Failed to read from cache',
        error
      );
      return null;
    }
  }

  private async invalidateCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
    } catch (error) {
      console.error('Error invalidating cache:', error);
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
      console.error('Error batch updating prayer times:', error);
      throw error;
    }
  }

  // Check if Firebase is connected
  async isConnected(): Promise<boolean> {
    return logFirebaseOperation(
      LogCategory.NETWORK,
      'isConnected',
      async () => {
        const connectedRef = ref(database, '.info/connected');
        const snapshot = await get(connectedRef);
        const isConnected = snapshot.val() === true;
        
        firebaseLogger.debug(
          LogCategory.NETWORK,
          'isConnected',
          `Firebase connection status: ${isConnected ? 'Connected' : 'Disconnected'}`,
          { isConnected }
        );
        
        return isConnected;
      }
    ).catch((error) => {
      firebaseLogger.error(
        LogCategory.NETWORK,
        'isConnected',
        'Failed to check connection status',
        error
      );
      return false;
    });
  }

  // Monitor connection status
  monitorConnectionStatus(callback: (isConnected: boolean) => void): () => void {
    const connectedRef = ref(database, '.info/connected');
    
    firebaseLogger.debug(
      LogCategory.NETWORK,
      'monitorConnectionStatus',
      'Setting up connection monitor'
    );
    
    const listener = (snapshot: DataSnapshot) => {
      const isConnected = snapshot.val() === true;
      
      firebaseLogger.info(
        LogCategory.NETWORK,
        'monitorConnectionStatus',
        `Connection status changed: ${isConnected ? 'Connected' : 'Disconnected'}`,
        { isConnected }
      );
      
      callback(isConnected);
    };

    onValue(connectedRef, listener);

    return () => {
      off(connectedRef, 'value', listener);
      firebaseLogger.debug(
        LogCategory.NETWORK,
        'monitorConnectionStatus',
        'Connection monitor removed'
      );
    };
  }
}

// Export singleton instance
export const firebasePrayerTimesService = FirebasePrayerTimesService.getInstance();
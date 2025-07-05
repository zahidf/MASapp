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
import { database } from '@/config/firebase';
import { PrayerTime } from '@/types/prayer';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRAYER_TIMES_PATH = 'prayerTimes';
const CACHE_KEY = 'firebase_prayer_times_cache';
const CACHE_TIMESTAMP_KEY = 'firebase_prayer_times_cache_timestamp';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

export class FirebasePrayerTimesService {
  private static instance: FirebasePrayerTimesService;
  private prayerTimesRef: DatabaseReference;
  private listeners: Map<string, (snapshot: DataSnapshot) => void> = new Map();

  private constructor() {
    this.prayerTimesRef = ref(database, PRAYER_TIMES_PATH);
  }

  static getInstance(): FirebasePrayerTimesService {
    if (!FirebasePrayerTimesService.instance) {
      FirebasePrayerTimesService.instance = new FirebasePrayerTimesService();
    }
    return FirebasePrayerTimesService.instance;
  }

  // Create or update prayer times
  async setPrayerTimes(prayerTimes: PrayerTime[]): Promise<void> {
    try {
      // Convert array to object with date as key for efficient lookups
      const prayerTimesObject: { [key: string]: PrayerTime } = {};
      prayerTimes.forEach((prayerTime) => {
        prayerTimesObject[prayerTime.d_date] = prayerTime;
      });

      await set(this.prayerTimesRef, prayerTimesObject);
      
      // Update local cache
      await this.updateCache(prayerTimes);
    } catch (error) {
      console.error('Error setting prayer times:', error);
      throw error;
    }
  }

  // Get all prayer times
  async getAllPrayerTimes(): Promise<PrayerTime[]> {
    try {
      // Try to get from cache first
      const cachedData = await this.getFromCache();
      if (cachedData) {
        return cachedData;
      }

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
      console.error('Error getting prayer times:', error);
      
      // Fall back to cache on error
      const cachedData = await this.getFromCache(true);
      if (cachedData) {
        return cachedData;
      }
      
      throw error;
    }
  }

  // Get prayer times for a specific date
  async getPrayerTimeByDate(date: string): Promise<PrayerTime | null> {
    try {
      const dateRef = ref(database, `${PRAYER_TIMES_PATH}/${date}`);
      const snapshot = await get(dateRef);
      
      if (snapshot.exists()) {
        return snapshot.val() as PrayerTime;
      }
      return null;
    } catch (error) {
      console.error('Error getting prayer time by date:', error);
      throw error;
    }
  }

  // Get prayer times for a date range
  async getPrayerTimesByDateRange(startDate: string, endDate: string): Promise<PrayerTime[]> {
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
        return prayerTimes.sort((a, b) => 
          new Date(a.d_date).getTime() - new Date(b.d_date).getTime()
        );
      }
      return [];
    } catch (error) {
      console.error('Error getting prayer times by date range:', error);
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
        throw new Error(`Prayer time for date ${date} not found`);
      }
    } catch (error) {
      console.error('Error updating prayer time:', error);
      throw error;
    }
  }

  // Delete prayer times for a specific date
  async deletePrayerTime(date: string): Promise<void> {
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
    const listener = (snapshot: DataSnapshot) => {
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
    };

    // Store the listener
    const listenerId = Date.now().toString();
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
      console.error('Error updating cache:', error);
    }
  }

  private async getFromCache(ignoreExpiry = false): Promise<PrayerTime[] | null> {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      const cacheTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedData && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;
        
        if (!isExpired || ignoreExpiry) {
          return JSON.parse(cachedData) as PrayerTime[];
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting from cache:', error);
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
    try {
      const connectedRef = ref(database, '.info/connected');
      const snapshot = await get(connectedRef);
      return snapshot.val() === true;
    } catch (error) {
      console.error('Error checking connection:', error);
      return false;
    }
  }

  // Monitor connection status
  monitorConnectionStatus(callback: (isConnected: boolean) => void): () => void {
    const connectedRef = ref(database, '.info/connected');
    
    const listener = (snapshot: DataSnapshot) => {
      callback(snapshot.val() === true);
    };

    onValue(connectedRef, listener);

    return () => {
      off(connectedRef, 'value', listener);
    };
  }
}

// Export singleton instance
export const firebasePrayerTimesService = FirebasePrayerTimesService.getInstance();
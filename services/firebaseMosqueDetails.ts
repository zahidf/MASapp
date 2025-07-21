import { ref, get, onValue, off, DataSnapshot } from 'firebase/database';
import { database } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MosqueDetails {
  donation_account?: {
    account_number: string;
    name: string;
    sort_code: string;
  };
  android_qr?: string;
  android_url?: string;
  ios_qr?: string;
  ios_url?: string;
  website_qr?: string;
  website_url?: string;
  services?: { [key: string]: string };
}

interface JumaahTimes {
  khutbah_begins: string;
  prayer_begins: string;
}

const MOSQUE_DETAILS_PATH = 'mosqueDetails';
const JUMAAH_PATH = 'prayerTimes/jumaah';
const SERVICES_PATH = 'mosqueDetails/services';
const CACHE_KEY_MOSQUE = 'firebase_mosque_details_cache';
const CACHE_KEY_JUMAAH = 'firebase_jumaah_times_cache';
const CACHE_DURATION = 1000 * 60 * 60 * 24 * 7; // 7 days

export class FirebaseMosqueDetailsService {
  private static instance: FirebaseMosqueDetailsService;
  private mosqueDetailsRef = ref(database, MOSQUE_DETAILS_PATH);
  private jumaahRef = ref(database, JUMAAH_PATH);
  private servicesRef = ref(database, SERVICES_PATH);

  private constructor() {}

  static getInstance(): FirebaseMosqueDetailsService {
    if (!FirebaseMosqueDetailsService.instance) {
      FirebaseMosqueDetailsService.instance = new FirebaseMosqueDetailsService();
    }
    return FirebaseMosqueDetailsService.instance;
  }

  // Get mosque details
  async getMosqueDetails(): Promise<MosqueDetails | null> {
    // Try cache first
    const cachedData = await this.getFromCache(CACHE_KEY_MOSQUE);
    if (cachedData) {
      // Check if cached data has services, if not, invalidate cache
      if (!cachedData.services || Object.keys(cachedData.services).length === 0) {
        // Cached data missing services, fetch fresh data
      } else {
        return cachedData;
      }
    }

    try {
      const snapshot = await get(this.mosqueDetailsRef);
      if (snapshot.exists()) {
        const data = snapshot.val() as MosqueDetails;
        
        // If services are not included, fetch them separately
        if (!data.services || Object.keys(data.services).length === 0) {
          const servicesSnapshot = await get(this.servicesRef);
          if (servicesSnapshot.exists()) {
            data.services = servicesSnapshot.val();
          }
        }
        
        await this.updateCache(CACHE_KEY_MOSQUE, data);
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching mosque details:', error);
      return null;
    }
  }

  // Get Jumaah times
  async getJumaahTimes(): Promise<JumaahTimes | null> {
    // Try cache first
    const cachedData = await this.getFromCache(CACHE_KEY_JUMAAH);
    if (cachedData) {
      return cachedData;
    }

    try {
      const snapshot = await get(this.jumaahRef);
      if (snapshot.exists()) {
        const data = snapshot.val() as JumaahTimes;
        await this.updateCache(CACHE_KEY_JUMAAH, data);
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching Jumaah times:', error);
      return null;
    }
  }

  // Subscribe to mosque details updates
  subscribeMosqueDetails(callback: (details: MosqueDetails | null) => void): () => void {
    const listener = (snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as MosqueDetails;
        this.updateCache(CACHE_KEY_MOSQUE, data);
        callback(data);
      } else {
        callback(null);
      }
    };

    onValue(this.mosqueDetailsRef, listener);

    return () => {
      off(this.mosqueDetailsRef, 'value', listener);
    };
  }

  // Subscribe to Jumaah times updates
  subscribeJumaahTimes(callback: (times: JumaahTimes | null) => void): () => void {
    const listener = (snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as JumaahTimes;
        this.updateCache(CACHE_KEY_JUMAAH, data);
        callback(data);
      } else {
        callback(null);
      }
    };

    onValue(this.jumaahRef, listener);

    return () => {
      off(this.jumaahRef, 'value', listener);
    };
  }

  // Cache management
  private async updateCache(key: string, data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
      await AsyncStorage.setItem(`${key}_timestamp`, Date.now().toString());
    } catch (error) {
      console.error('Error updating cache:', error);
    }
  }

  private async getFromCache(key: string): Promise<any | null> {
    try {
      const cachedData = await AsyncStorage.getItem(key);
      const cacheTimestamp = await AsyncStorage.getItem(`${key}_timestamp`);
      
      if (cachedData && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp);
        const age = Date.now() - timestamp;
        
        if (age < CACHE_DURATION) {
          return JSON.parse(cachedData);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }
}

export const firebaseMosqueDetailsService = FirebaseMosqueDetailsService.getInstance();
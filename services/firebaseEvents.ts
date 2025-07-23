import { database } from '@/config/firebase';
import { ref, onValue, off, get } from 'firebase/database';
import { Event, EventWithId, PrayerName, EventNotificationPreference } from '@/types/event';
import { PrayerTimes } from '@/types/prayer';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EVENTS_NODE = 'events';
const EVENT_NOTIFICATIONS_KEY = '@event_notifications';

export const calculateRelativeEventTime = (
  event: Event,
  prayerTimes: PrayerTimes
): { startTime: Date | null; endTime: Date | null } => {
  if (event.timeType !== 'relative' || !event.relativePrayer || !event.relativeMinutes) {
    return { startTime: null, endTime: null };
  }

  const basePrayerTime = prayerTimes[event.relativePrayer as keyof PrayerTimes];
  if (!basePrayerTime) {
    return { startTime: null, endTime: null };
  }

  const baseTime = new Date();
  const [hours, minutes] = basePrayerTime.split(':').map(Number);
  baseTime.setHours(hours, minutes, 0, 0);

  const offsetMinutes = parseInt(event.relativeMinutes);
  const startTime = new Date(baseTime);
  
  if (event.relativePosition === 'after') {
    startTime.setMinutes(startTime.getMinutes() + offsetMinutes);
  } else {
    startTime.setMinutes(startTime.getMinutes() - offsetMinutes);
  }

  let endTime: Date | null = null;

  if (event.durationType === 'fixed' && event.eventDuration) {
    endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + parseInt(event.eventDuration));
  } else if (event.durationType === 'until' && event.durationUntilPrayer) {
    const untilPrayerTime = prayerTimes[event.durationUntilPrayer as keyof PrayerTimes];
    if (untilPrayerTime) {
      endTime = new Date();
      const [untilHours, untilMinutes] = untilPrayerTime.split(':').map(Number);
      endTime.setHours(untilHours, untilMinutes, 0, 0);
    }
  }

  return { startTime, endTime };
};

export const shouldShowOnetimeEvent = (event: Event, currentDate: Date): boolean => {
  if (!event.eventDate) return false;
  
  const eventDate = new Date(event.eventDate);
  return (
    eventDate.getFullYear() === currentDate.getFullYear() &&
    eventDate.getMonth() === currentDate.getMonth() &&
    eventDate.getDate() === currentDate.getDate()
  );
};

export const shouldShowRecurringEvent = (event: Event, currentDate: Date): boolean => {
  if (!event.eventDays || event.eventDays.length === 0) return false;
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[currentDate.getDay()];
  
  return event.eventDays.includes(dayName as any);
};

export const getEventsForToday = (
  eventsData: Record<string, Event>,
  prayerTimes: PrayerTimes | null
): EventWithId[] => {
  const today = new Date();
  const todayEvents: EventWithId[] = [];

  Object.entries(eventsData).forEach(([id, event]) => {
    let shouldShow = false;

    if (event.eventType === 'onetime') {
      shouldShow = shouldShowOnetimeEvent(event, today);
    } else if (event.eventType === 'recurring') {
      shouldShow = shouldShowRecurringEvent(event, today);
    }

    if (shouldShow) {
      const eventWithId: EventWithId = { id, ...event };

      if (event.timeType === 'relative' && prayerTimes) {
        const { startTime, endTime } = calculateRelativeEventTime(event, prayerTimes);
        if (startTime) eventWithId.calculatedStartTime = startTime;
        if (endTime) eventWithId.calculatedEndTime = endTime;
      } else if (event.timeType === 'fixed') {
        if (event.startTime) {
          const [hours, minutes] = event.startTime.split(':').map(Number);
          const startTime = new Date();
          startTime.setHours(hours, minutes, 0, 0);
          eventWithId.calculatedStartTime = startTime;
        }
        
        if (event.endTime) {
          const [hours, minutes] = event.endTime.split(':').map(Number);
          const endTime = new Date();
          endTime.setHours(hours, minutes, 0, 0);
          eventWithId.calculatedEndTime = endTime;
        }
      }

      todayEvents.push(eventWithId);
    }
  });

  return todayEvents.sort((a, b) => {
    const timeA = a.calculatedStartTime?.getTime() || 0;
    const timeB = b.calculatedStartTime?.getTime() || 0;
    return timeA - timeB;
  });
};

export const subscribeToEvents = (
  callback: (events: Record<string, Event>) => void
): (() => void) => {
  const eventsRef = ref(database, EVENTS_NODE);
  
  onValue(eventsRef, (snapshot) => {
    const data = snapshot.val() || {};
    callback(data);
  });

  return () => off(eventsRef);
};

export const fetchEvents = async (): Promise<Record<string, Event>> => {
  try {
    const eventsRef = ref(database, EVENTS_NODE);
    const snapshot = await get(eventsRef);
    return snapshot.val() || {};
  } catch (error) {
    console.error('Error fetching events:', error);
    return {};
  }
};

export const saveEventNotificationPreference = async (
  preference: EventNotificationPreference
): Promise<void> => {
  try {
    const existingPrefs = await getEventNotificationPreferences();
    const updatedPrefs = existingPrefs.filter(p => p.eventId !== preference.eventId);
    updatedPrefs.push(preference);
    
    await AsyncStorage.setItem(EVENT_NOTIFICATIONS_KEY, JSON.stringify(updatedPrefs));
  } catch (error) {
    console.error('Error saving event notification preference:', error);
  }
};

export const getEventNotificationPreferences = async (): Promise<EventNotificationPreference[]> => {
  try {
    const prefsString = await AsyncStorage.getItem(EVENT_NOTIFICATIONS_KEY);
    return prefsString ? JSON.parse(prefsString) : [];
  } catch (error) {
    console.error('Error getting event notification preferences:', error);
    return [];
  }
};

export const getEventNotificationPreference = async (
  eventId: string
): Promise<EventNotificationPreference | null> => {
  const prefs = await getEventNotificationPreferences();
  return prefs.find(p => p.eventId === eventId) || null;
};
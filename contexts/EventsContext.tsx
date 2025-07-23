import React, { createContext, useContext, useState, useEffect } from 'react';
import { Event, EventWithId, EventNotificationPreference } from '@/types/event';
import { 
  subscribeToEvents, 
  getEventsForToday, 
  saveEventNotificationPreference,
  getEventNotificationPreferences,
  getEventNotificationPreference 
} from '@/services/firebaseEvents';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { NotificationService } from '@/utils/notificationService';

interface EventsContextType {
  events: Record<string, Event>;
  todayEvents: EventWithId[];
  homePageEvents: EventWithId[];
  loading: boolean;
  error: string | null;
  refreshEvents: () => void;
  setEventNotificationPreference: (eventId: string, enabled: boolean, minutesBefore: number) => Promise<void>;
  getEventNotificationPref: (eventId: string) => Promise<EventNotificationPreference | null>;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export const useEvents = () => {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
};

export const EventsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<Record<string, Event>>({});
  const [todayEvents, setTodayEvents] = useState<EventWithId[]>([]);
  const [homePageEvents, setHomePageEvents] = useState<EventWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { prayerTimes } = usePrayerTimes();

  useEffect(() => {
    const unsubscribe = subscribeToEvents((fetchedEvents) => {
      setEvents(fetchedEvents);
      
      // Get events for today
      const today = getEventsForToday(fetchedEvents, prayerTimes);
      setTodayEvents(today);
      
      // Filter home page events
      const homePage = today.filter(event => event.showOnHomePage);
      setHomePageEvents(homePage);
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [prayerTimes]);

  // Schedule notifications for today's events
  useEffect(() => {
    const scheduleEventNotifications = async () => {
      if (todayEvents.length > 0) {
        const preferences = await getEventNotificationPreferences();
        await NotificationService.scheduleAllEventNotifications(todayEvents, preferences);
      }
    };
    
    scheduleEventNotifications();
  }, [todayEvents]);

  const refreshEvents = () => {
    if (events && Object.keys(events).length > 0) {
      const today = getEventsForToday(events, prayerTimes);
      setTodayEvents(today);
      
      const homePage = today.filter(event => event.showOnHomePage);
      setHomePageEvents(homePage);
    }
  };

  const setEventNotificationPreference = async (
    eventId: string, 
    enabled: boolean, 
    minutesBefore: number
  ) => {
    const preference: EventNotificationPreference = {
      eventId,
      enabled,
      minutesBefore
    };
    
    await saveEventNotificationPreference(preference);
    
    // Schedule or cancel the notification
    const event = todayEvents.find(e => e.id === eventId);
    if (event) {
      if (enabled) {
        await NotificationService.scheduleEventNotification(event, preference);
      } else {
        await NotificationService.cancelEventNotification(eventId);
      }
    }
  };

  const getEventNotificationPref = async (eventId: string) => {
    return await getEventNotificationPreference(eventId);
  };

  const value = {
    events,
    todayEvents,
    homePageEvents,
    loading,
    error,
    refreshEvents,
    setEventNotificationPreference,
    getEventNotificationPref
  };

  return (
    <EventsContext.Provider value={value}>
      {children}
    </EventsContext.Provider>
  );
};
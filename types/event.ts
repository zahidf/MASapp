export type TimeType = 'fixed' | 'relative';
export type EventType = 'onetime' | 'recurring';
export type AttendeeType = 'everyone' | 'men' | 'women' | 'children' | 'youth';
export type DurationType = 'none' | 'fixed' | 'until';
export type RelativePosition = 'before' | 'after';
export type PrayerName = 'fajr' | 'sunrise' | 'zuhr' | 'asr' | 'maghrib' | 'isha';
export type DayName = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface EventAppearance {
  fontFamily?: string;
  fontSize?: string;
  fontColor?: string;
  fontBold?: boolean;
  fontItalic?: boolean;
  bgColorExpanded?: string;
  borderColorExpanded?: string;
  bgColorCollapsed?: string;
  borderColorCollapsed?: string;
}

export interface Event {
  // Basic Information
  header: string;
  subheader?: string;
  description?: string;
  imageUrl?: string;
  
  // Time Configuration
  timeType: TimeType;
  
  // For Fixed Time Events
  startTime?: string;
  endTime?: string;
  
  // For Relative Time Events
  relativeMinutes?: string;
  relativePosition?: RelativePosition;
  relativePrayer?: PrayerName;
  
  // Duration Configuration
  durationType?: DurationType;
  eventDuration?: string;
  durationUntilPrayer?: PrayerName;
  
  // Event Schedule
  eventType: EventType;
  eventDate?: string;
  eventDays?: DayName[];
  
  // Display Options
  showOnHomePage: boolean;
  attendees: AttendeeType;
  additionalInfo?: string;
  speakers?: string;                // Optional: Speaker names (comma-separated)
  reciters?: string;                // Optional: Reciter names (comma-separated)
  
  // Appearance Customization
  appearance: EventAppearance;
  
  // Metadata
  updatedAt: string;
}

export interface EventWithId extends Event {
  id: string;
  calculatedStartTime?: Date;
  calculatedEndTime?: Date;
}

export interface EventNotificationPreference {
  eventId: string;
  enabled: boolean;
  minutesBefore: number;
  lastNotificationTime?: string;
}
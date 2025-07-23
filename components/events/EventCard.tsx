import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image,
  Switch,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EventWithId, EventNotificationPreference } from '@/types/event';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEvents } from '@/contexts/EventsContext';

interface EventCardProps {
  event: EventWithId;
  expanded?: boolean;
  onPress?: () => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, expanded: initialExpanded = false, onPress }) => {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [minutesBefore, setMinutesBefore] = useState(15);
  const [imageLoading, setImageLoading] = useState(true);
  
  const { t } = useLanguage();
  const { setEventNotificationPreference, getEventNotificationPref } = useEvents();
  
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const accentColor = useThemeColor({}, 'tint');
  const colorScheme = useColorScheme() ?? 'light';

  useEffect(() => {
    loadNotificationPreference();
  }, []);

  const loadNotificationPreference = async () => {
    const pref = await getEventNotificationPref(event.id);
    if (pref) {
      setNotificationEnabled(pref.enabled);
      setMinutesBefore(pref.minutesBefore);
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    setNotificationEnabled(enabled);
    await setEventNotificationPreference(event.id, enabled, minutesBefore);
  };

  const handleMinutesChange = async (minutes: number) => {
    setMinutesBefore(minutes);
    if (notificationEnabled) {
      await setEventNotificationPreference(event.id, true, minutes);
    }
  };

  const getEventStyles = () => {
    const appearance = event.appearance || {};
    const isExpanded = expanded;
    const themeColors = appearance[colorScheme];
    
    // Use theme-specific colors if available, otherwise fall back to legacy colors
    const bgColorExpanded = themeColors?.bgColorExpanded || appearance.bgColorExpanded || surfaceColor;
    const bgColorCollapsed = themeColors?.bgColorCollapsed || appearance.bgColorCollapsed || surfaceColor;
    const borderColorExpanded = themeColors?.borderColorExpanded || appearance.borderColorExpanded || borderColor;
    const borderColorCollapsed = themeColors?.borderColorCollapsed || appearance.borderColorCollapsed || borderColor;
    const fontColor = themeColors?.fontColor || appearance.fontColor || textColor;
    
    return {
      container: {
        backgroundColor: isExpanded ? bgColorExpanded : bgColorCollapsed,
        borderColor: isExpanded ? borderColorExpanded : borderColorCollapsed,
      },
      text: {
        fontFamily: appearance.fontFamily || undefined,
        fontSize: appearance.fontSize ? parseInt(appearance.fontSize) : 16,
        color: fontColor,
        fontWeight: appearance.fontBold ? 'bold' : 'normal' as any,
        fontStyle: appearance.fontItalic ? 'italic' : 'normal' as any,
      }
    };
  };

  const formatEventTime = () => {
    if (event.timeType === 'fixed') {
      const formatTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes);
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      };
      
      const startTime = event.startTime ? formatTime(event.startTime) : '';
      const endTime = event.endTime ? formatTime(event.endTime) : '';
      return endTime ? `${startTime} - ${endTime}` : startTime;
    } else {
      const position = event.relativePosition === 'after' ? t.after : t.before;
      const prayerName = t.prayers[event.relativePrayer || 'fajr'];
      const relativeMinutes = parseInt(event.relativeMinutes || '0');
      const timeText = relativeMinutes === 0 
        ? `${position} ${prayerName}` 
        : `${event.relativeMinutes} ${t.minutes} ${position} ${prayerName}`;
      
      if (event.durationType === 'fixed' && event.eventDuration) {
        return `${timeText} (${event.eventDuration} ${t.min})`;
      } else if (event.durationType === 'until' && event.durationUntilPrayer) {
        return `${timeText} ${t.until} ${t.prayers[event.durationUntilPrayer]}`;
      }
      
      return timeText;
    }
  };

  const getAttendeeIcon = () => {
    switch (event.attendees) {
      case 'men': return 'man';
      case 'women': return 'woman';
      case 'children': return 'happy';
      case 'youth': return 'school';
      default: return 'people';
    }
  };

  const styles = getEventStyles();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setExpanded(!expanded);
    }
  };

  const notificationOptions = [5, 10, 15, 30, 45, 60, 90, 120];

  return (
    <>
      <TouchableOpacity 
        style={[baseStyles.container, styles.container]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={baseStyles.header}>
          <View style={baseStyles.headerLeft}>
            <ThemedText style={[baseStyles.title, styles.text]}>
              {event.header}
            </ThemedText>
            {event.subheader && (
              <ThemedText style={[baseStyles.subtitle, styles.text, { fontSize: (styles.text.fontSize || 16) - 2 }]}>
                {event.subheader}
              </ThemedText>
            )}
            <View style={baseStyles.timeRow}>
              <Ionicons name="time-outline" size={16} color={styles.text.color} />
              <ThemedText style={[baseStyles.timeText, styles.text, { fontSize: (styles.text.fontSize || 16) - 2 }]}>
                {formatEventTime()}
              </ThemedText>
              {event.eventType === 'recurring' && event.eventDays && event.eventDays.length > 0 && (
                <>
                  <ThemedText style={[baseStyles.separator, styles.text]}> • </ThemedText>
                  <ThemedText style={[baseStyles.recurringText, styles.text, { fontSize: (styles.text.fontSize || 16) - 2 }]}>
                    {event.eventDays.length === 1 
                      ? `${t.every} ${t[event.eventDays[0].toLowerCase() as keyof typeof t] || event.eventDays[0]}`
                      : `${t.every} ${event.eventDays.map(day => t[day.toLowerCase() as keyof typeof t] || day).join(', ')}`
                    }
                  </ThemedText>
                </>
              )}
            </View>
          </View>
          
          <View style={baseStyles.headerRight}>
            <View style={baseStyles.attendeeIcon}>
              <Ionicons name={getAttendeeIcon() as any} size={20} color={styles.text.color} />
            </View>
            <TouchableOpacity
              onPress={() => setShowNotificationModal(true)}
              style={baseStyles.bellIcon}
            >
              <Ionicons 
                name={notificationEnabled ? "notifications" : "notifications-outline"} 
                size={24} 
                color={notificationEnabled ? accentColor : styles.text.color} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {expanded && (
          <View style={baseStyles.expandedContent}>
            {event.imageUrl && (
              <View style={baseStyles.imageContainer}>
                <Image 
                  source={{ uri: event.imageUrl }} 
                  style={baseStyles.eventImage}
                  onLoadStart={() => setImageLoading(true)}
                  onLoadEnd={() => setImageLoading(false)}
                  resizeMode="contain"
                />
                {imageLoading && (
                  <View style={[baseStyles.imageLoader, { backgroundColor: borderColor }]}>
                    <ActivityIndicator size="small" color={accentColor} />
                  </View>
                )}
              </View>
            )}
            
            {event.description && (
              <ThemedText style={[baseStyles.description, styles.text]}>
                {event.description}
              </ThemedText>
            )}
            
            {event.speakers && (
              <View style={baseStyles.infoRow}>
                <Ionicons name="mic-outline" size={16} color={styles.text.color} />
                <ThemedText style={[baseStyles.infoLabel, styles.text]}>
                  {t.speakers || 'Speakers'}: 
                </ThemedText>
                <ThemedText style={[baseStyles.infoText, styles.text]}>
                  {event.speakers}
                </ThemedText>
              </View>
            )}
            
            {event.reciters && (
              <View style={baseStyles.infoRow}>
                <Ionicons name="book-outline" size={16} color={styles.text.color} />
                <ThemedText style={[baseStyles.infoLabel, styles.text]}>
                  {t.reciters || 'Reciters'}: 
                </ThemedText>
                <ThemedText style={[baseStyles.infoText, styles.text]}>
                  {event.reciters}
                </ThemedText>
              </View>
            )}
            
            {event.additionalInfo && (
              <ThemedText style={[baseStyles.additionalInfo, styles.text]}>
                {event.additionalInfo}
              </ThemedText>
            )}
          </View>
        )}
        
        <View style={baseStyles.chevronContainer}>
          <Ionicons 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={styles.text.color} 
          />
        </View>
      </TouchableOpacity>

      <Modal
        visible={showNotificationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <View style={baseStyles.modalOverlay}>
          <View style={[baseStyles.modalContent, { backgroundColor }]}>
            <ThemedText style={baseStyles.modalTitle}>
              {t.eventNotifications}
            </ThemedText>
            
            <ThemedText style={baseStyles.eventTitle}>
              {event.header}
            </ThemedText>
            
            <View style={baseStyles.notificationToggle}>
              <ThemedText>{t.enableNotifications}</ThemedText>
              <Switch
                value={notificationEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: borderColor, true: accentColor }}
                thumbColor={Platform.OS === 'ios' ? '#fff' : accentColor}
              />
            </View>
            
            {notificationEnabled && (
              <View style={baseStyles.minutesSection}>
                <ThemedText style={baseStyles.minutesLabel}>
                  {t.notifyBefore}:
                </ThemedText>
                <ScrollView style={baseStyles.minutesScroll}>
                  {notificationOptions.map((minutes) => (
                    <TouchableOpacity
                      key={minutes}
                      style={[
                        baseStyles.minuteOption,
                        { borderColor },
                        minutesBefore === minutes && { backgroundColor: accentColor }
                      ]}
                      onPress={() => handleMinutesChange(minutes)}
                    >
                      <ThemedText 
                        style={[
                          baseStyles.minuteText,
                          minutesBefore === minutes && { color: '#fff' }
                        ]}
                      >
                        {minutes} {t.minutes}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            
            <TouchableOpacity
              style={[baseStyles.closeButton, { backgroundColor: accentColor }]}
              onPress={() => setShowNotificationModal(false)}
            >
              <ThemedText style={baseStyles.closeButtonText}>{t.done}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const baseStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 14,
  },
  separator: {
    fontSize: 14,
    opacity: 0.5,
  },
  recurringText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  attendeeIcon: {
    padding: 4,
  },
  bellIcon: {
    padding: 4,
  },
  expandedContent: {
    marginTop: 16,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 12,
  },
  eventImage: {
    width: '100%',
    height: 200,
    aspectRatio: 16 / 9,
    borderRadius: 8,
  },
  imageLoader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  description: {
    marginBottom: 12,
    lineHeight: 22,
  },
  additionalInfo: {
    marginBottom: 12,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  recurringInfo: {
    marginTop: 8,
  },
  recurringLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  recurringDays: {
    opacity: 0.8,
  },
  chevronContainer: {
    position: 'absolute',
    bottom: 8,
    right: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  eventTitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    opacity: 0.8,
  },
  notificationToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  minutesSection: {
    marginBottom: 20,
  },
  minutesLabel: {
    fontSize: 16,
    marginBottom: 12,
  },
  minutesScroll: {
    maxHeight: 200,
  },
  minuteOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  minuteText: {
    textAlign: 'center',
  },
  closeButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: '600',
  },
  infoText: {
    flex: 1,
    flexWrap: 'wrap',
  },
});
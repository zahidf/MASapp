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
  ActivityIndicator,
  Dimensions,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EventWithId, EventNotificationPreference } from '@/types/event';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEvents } from '@/contexts/EventsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const [showImageModal, setShowImageModal] = useState(false);
  
  const screenWidth = Dimensions.get('window').width;
  const insets = useSafeAreaInsets();
  
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

  const getAttendeeInfo = () => {
    switch (event.attendees) {
      case 'men': return { icon: 'man', label: t.men || 'Men' };
      case 'women': return { icon: 'woman', label: t.women || 'Women' };
      case 'children': return { icon: 'happy', label: t.children || 'Children' };
      case 'youth': return { icon: 'school', label: t.youth || 'Youth' };
      default: return { icon: 'people', label: t.everyone || 'Everyone' };
    }
  };
  
  const renderSpeakers = (speakers: string) => {
    return speakers.split(',').map(speaker => speaker.trim()).filter(Boolean);
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
  const attendeeInfo = getAttendeeInfo();

  return (
    <>
      <TouchableOpacity 
        style={[baseStyles.container, styles.container]}
        onPress={handlePress}
        activeOpacity={0.95}
      >
        <View style={baseStyles.header}>
          <View style={baseStyles.headerContent}>
            <View style={baseStyles.topRow}>
              <View style={baseStyles.titleWrapper}>
                <ThemedText style={[baseStyles.title, styles.text]}>
                  {event.header}
                </ThemedText>
                {event.subheader && (
                  <ThemedText style={[baseStyles.subtitle, styles.text, { fontSize: (styles.text.fontSize || 16) - 2 }]}>
                    {event.subheader}
                  </ThemedText>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setShowNotificationModal(true)}
                style={baseStyles.notificationButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name={notificationEnabled ? "notifications" : "notifications-outline"} 
                  size={20} 
                  color={notificationEnabled ? accentColor : styles.text.color} 
                />
              </TouchableOpacity>
            </View>
            
            <View style={baseStyles.bottomRow}>
              <View style={baseStyles.timeSection}>
                <Ionicons name="time-outline" size={14} color={styles.text.color} />
                <ThemedText style={[baseStyles.timeText, styles.text, { fontSize: (styles.text.fontSize || 16) - 3 }]}>
                  {formatEventTime()}
                </ThemedText>
                {event.eventType === 'recurring' && event.eventDays && event.eventDays.length > 0 && (
                  <>
                    <ThemedText style={[baseStyles.separator, styles.text]}> • </ThemedText>
                    <Ionicons name="repeat-outline" size={14} color={styles.text.color} />
                    <ThemedText style={[baseStyles.recurringText, styles.text, { fontSize: (styles.text.fontSize || 16) - 3 }]}>
                      {event.eventDays.length === 1 
                        ? `${t.every} ${t[event.eventDays[0].toLowerCase() as keyof typeof t] || event.eventDays[0]}`
                        : `${t.every} ${event.eventDays.map(day => t[day.toLowerCase() as keyof typeof t] || day).join(', ')}`
                      }
                    </ThemedText>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>

        {expanded && (
          <View style={baseStyles.expandedContent}>
            {event.imageUrl && (
              <Pressable 
                onPress={() => setShowImageModal(true)}
                style={baseStyles.imageContainer}
              >
                <Image 
                  source={{ uri: event.imageUrl }} 
                  style={baseStyles.eventImage}
                  onLoadStart={() => setImageLoading(true)}
                  onLoadEnd={() => setImageLoading(false)}
                  resizeMode="cover"
                />
                {imageLoading && (
                  <View style={[baseStyles.imageLoader, { backgroundColor: surfaceColor }]}>
                    <ActivityIndicator size="small" color={accentColor} />
                  </View>
                )}
                <View style={baseStyles.imageOverlay}>
                  <View style={baseStyles.expandHint}>
                    <Ionicons name="expand-outline" size={16} color="#fff" />
                  </View>
                </View>
              </Pressable>
            )}
            
            {event.description && (
              <View style={baseStyles.descriptionContainer}>
                <ThemedText style={[baseStyles.description, styles.text]}>
                  {event.description}
                </ThemedText>
              </View>
            )}
            
            <View style={baseStyles.detailsSection}>
              <View style={baseStyles.detailCard}>
                <View style={baseStyles.detailHeader}>
                  <Ionicons name="people-outline" size={18} color={styles.text.color} />
                  <ThemedText style={[baseStyles.detailTitle, styles.text, { fontSize: (styles.text.fontSize || 14) - 2 }]}>
                    {t.whoCanAttend || 'Who Can Attend'}
                  </ThemedText>
                </View>
                <View style={baseStyles.attendeeInfo}>
                  <View style={[baseStyles.attendeeBadge, { borderColor: styles.text.color, backgroundColor: styles.container.backgroundColor }]}>
                    <Ionicons name={attendeeInfo.icon as any} size={16} color={styles.text.color} />
                    <ThemedText style={[baseStyles.attendeeLabel, styles.text, { fontSize: styles.text.fontSize || 14 }]}>
                      {attendeeInfo.label === 'Men' ? t.menOnly || 'Men Only' : 
                       attendeeInfo.label === 'Women' ? t.womenOnly || 'Women Only' :
                       attendeeInfo.label === 'Children' ? t.childrenOnly || 'Children Only' :
                       attendeeInfo.label === 'Youth' ? t.youthOnly || 'Youth Only' :
                       t.everyoneWelcome || 'Everyone Welcome'
                      }
                    </ThemedText>
                  </View>
                </View>
              </View>
              
              {event.speakers && (
                <View style={baseStyles.detailCard}>
                  <View style={baseStyles.detailHeader}>
                    <Ionicons name="person-circle-outline" size={18} color={styles.text.color} />
                    <ThemedText style={[baseStyles.detailTitle, styles.text, { fontSize: (styles.text.fontSize || 14) - 2 }]}>
                      {t.speakers || 'Speakers'}
                    </ThemedText>
                  </View>
                  <View style={baseStyles.detailContent}>
                    {renderSpeakers(event.speakers).map((speaker, index) => (
                      <View key={index} style={baseStyles.personTag}>
                        <Ionicons name="person" size={14} color={styles.text.color} />
                        <ThemedText style={[baseStyles.personName, styles.text, { fontSize: styles.text.fontSize || 14 }]}>
                          {speaker}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              {event.reciters && (
                <View style={baseStyles.detailCard}>
                  <View style={baseStyles.detailHeader}>
                    <Ionicons name="book-outline" size={18} color={styles.text.color} />
                    <ThemedText style={[baseStyles.detailTitle, styles.text, { fontSize: (styles.text.fontSize || 14) - 2 }]}>
                      {t.reciters || 'Reciters'}
                    </ThemedText>
                  </View>
                  <View style={baseStyles.detailContent}>
                    {renderSpeakers(event.reciters).map((reciter, index) => (
                      <View key={index} style={baseStyles.personTag}>
                        <Ionicons name="person" size={14} color={styles.text.color} />
                        <ThemedText style={[baseStyles.personName, styles.text, { fontSize: styles.text.fontSize || 14 }]}>
                          {reciter}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
            
            {event.additionalInfo && (
              <View style={baseStyles.additionalInfoCard}>
                <Ionicons name="information-circle-outline" size={16} color={styles.text.color} />
                <ThemedText style={[baseStyles.additionalInfo, styles.text]}>
                  {event.additionalInfo}
                </ThemedText>
              </View>
            )}
          </View>
        )}
        
        <View style={baseStyles.expandIndicator}>
          <Ionicons 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={14} 
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
          <View style={[baseStyles.modalContent, { backgroundColor, paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 24 }]}>
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

      <Modal
        visible={showImageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <Pressable 
          style={baseStyles.imageModalOverlay}
          onPress={() => setShowImageModal(false)}
        >
          <View style={baseStyles.imageModalContent}>
            <Image 
              source={{ uri: event.imageUrl }} 
              style={baseStyles.fullScreenImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={baseStyles.closeImageButton}
              onPress={() => setShowImageModal(false)}
            >
              <Ionicons name="close-circle" size={36} color="#fff" />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const baseStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  header: {
    padding: 14,
    paddingBottom: 12,
  },
  headerContent: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleWrapper: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 5,
  },
  timeText: {
    fontSize: 13,
    opacity: 0.8,
  },
  separator: {
    fontSize: 13,
    opacity: 0.5,
    marginHorizontal: 3,
  },
  recurringText: {
    fontSize: 13,
    opacity: 0.8,
  },
  attendeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  attendeeLabel: {
    fontWeight: '500',
  },
  notificationButton: {
    padding: 6,
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  eventImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  expandHint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    borderRadius: 8,
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  description: {
    lineHeight: 24,
    fontSize: 15,
  },
  detailsSection: {
    gap: 12,
    marginBottom: 12,
  },
  detailCard: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  detailTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  detailContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  personTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  personName: {
    fontWeight: '500',
  },
  additionalInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  additionalInfo: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  expandIndicator: {
    position: 'absolute',
    bottom: 6,
    right: 14,
    opacity: 0.4,
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
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '95%',
    height: '95%',
  },
  closeImageButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
});
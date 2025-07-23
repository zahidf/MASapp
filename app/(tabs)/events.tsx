import React, { useState, useMemo, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Text,
  Animated,
  Dimensions,
  Modal
} from 'react-native';
import { BlurView } from 'expo-blur';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { EventCard } from '@/components/events/EventCard';
import { useEvents } from '@/contexts/EventsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { EventWithId } from '@/types/event';

type FilterType = 'all' | 'today' | 'upcoming' | 'recurring';
type AttendeeFilter = 'all' | 'everyone' | 'men' | 'women' | 'children' | 'youth';

const { width } = Dimensions.get('window');

export default function EventsScreen() {
  const { events, todayEvents, loading, error, refreshEvents } = useEvents();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [attendeeFilter, setAttendeeFilter] = useState<AttendeeFilter>('all');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  const colorScheme = useColorScheme();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'tint');
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'tabIconDefault');

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshEvents();
    setRefreshing(false);
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const filteredEvents = useMemo(() => {
    let filtered: EventWithId[] = [];
    
    // First filter by type
    switch (filterType) {
      case 'today':
        filtered = todayEvents;
        break;
      case 'upcoming':
        // Get all one-time events in the future
        const now = new Date();
        filtered = Object.entries(events)
          .filter(([id, event]) => {
            if (event.eventType !== 'onetime' || !event.eventDate) return false;
            const eventDate = new Date(event.eventDate);
            return eventDate > now;
          })
          .map(([id, event]) => ({ id, ...event }))
          .sort((a, b) => {
            const dateA = new Date(a.eventDate || '');
            const dateB = new Date(b.eventDate || '');
            return dateA.getTime() - dateB.getTime();
          });
        break;
      case 'recurring':
        filtered = Object.entries(events)
          .filter(([id, event]) => event.eventType === 'recurring')
          .map(([id, event]) => ({ id, ...event }));
        break;
      case 'all':
      default:
        filtered = Object.entries(events).map(([id, event]) => ({ id, ...event }));
        break;
    }
    
    // Then filter by attendee type
    if (attendeeFilter !== 'all') {
      filtered = filtered.filter(event => event.attendees === attendeeFilter);
    }
    
    return filtered;
  }, [events, todayEvents, filterType, attendeeFilter]);

  const getFilterLabel = () => {
    const parts = [];
    
    // Add filter type label
    if (filterType !== 'all') {
      parts.push(t[filterType] || filterType);
    }
    
    // Add attendee filter label
    if (attendeeFilter !== 'all') {
      parts.push(t[attendeeFilter] || attendeeFilter);
    }
    
    return parts.length > 0 ? parts.join(' • ') : t.allEvents || 'All Events';
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filterType !== 'all') count++;
    if (attendeeFilter !== 'all') count++;
    return count;
  };

  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={accentColor} />
        <ThemedText style={styles.loadingText}>{t.loadingEvents}</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={textColor} />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />
      
      <Animated.View
        style={[
          styles.headerWrapper,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <BlurView
          intensity={85}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              <Text style={[styles.headerTitle, { color: textColor }]}>{t.events}</Text>
              <View style={[styles.eventCountBadge, { backgroundColor: accentColor + '20' }]}>
                <Text style={[styles.eventCountText, { color: accentColor }]}>
                  {filteredEvents.length}
                </Text>
              </View>
            </View>
            <Text style={[styles.headerSubtitle, { color: textColor + '80' }]}>
              {t.upcomingEvents || 'Upcoming mosque events and programs'}
            </Text>
          </View>
        </BlurView>
        <View style={styles.headerEdgeEffect}>
          <View
            style={[
              styles.headerEdgeGradient,
              {
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
              },
            ]}
          />
        </View>
      </Animated.View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      >

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterDropdown, { borderColor }]}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.filterDropdownLeft}>
              <Ionicons name="filter-outline" size={18} color={textColor} />
              <ThemedText style={styles.filterDropdownText}>
                {getFilterLabel()}
              </ThemedText>
            </View>
            <View style={styles.filterDropdownRight}>
              {getActiveFilterCount() > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
                </View>
              )}
              <Ionicons name="chevron-down" size={18} color={textColor} />
            </View>
          </TouchableOpacity>
        </View>

        {filteredEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={borderColor} />
            <ThemedText style={styles.emptyText}>{t.noEventsFound}</ThemedText>
            <ThemedText style={styles.emptySubtext}>{t.tryDifferentFilter}</ThemedText>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalOverlayTouch} 
            activeOpacity={1}
            onPress={() => setShowFilterModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>{t.filters || 'Filters'}</ThemedText>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <ThemedText style={styles.filterSectionTitle}>{t.eventType || 'Event Type'}</ThemedText>
              <View style={styles.filterOptionsGrid}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { borderColor },
                    filterType === 'all' && { backgroundColor: accentColor, borderColor: accentColor }
                  ]}
                  onPress={() => setFilterType('all')}
                >
                  <Ionicons 
                    name="list-outline" 
                    size={20} 
                    color={filterType === 'all' ? '#fff' : textColor} 
                  />
                  <ThemedText style={[
                    styles.filterOptionText,
                    filterType === 'all' && { color: '#fff' }
                  ]}>
                    {t.all || 'All'}
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { borderColor },
                    filterType === 'today' && { backgroundColor: accentColor, borderColor: accentColor }
                  ]}
                  onPress={() => setFilterType('today')}
                >
                  <Ionicons 
                    name="today-outline" 
                    size={20} 
                    color={filterType === 'today' ? '#fff' : textColor} 
                  />
                  <ThemedText style={[
                    styles.filterOptionText,
                    filterType === 'today' && { color: '#fff' }
                  ]}>
                    {t.today || 'Today'}
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { borderColor },
                    filterType === 'upcoming' && { backgroundColor: accentColor, borderColor: accentColor }
                  ]}
                  onPress={() => setFilterType('upcoming')}
                >
                  <Ionicons 
                    name="arrow-forward-circle-outline" 
                    size={20} 
                    color={filterType === 'upcoming' ? '#fff' : textColor} 
                  />
                  <ThemedText style={[
                    styles.filterOptionText,
                    filterType === 'upcoming' && { color: '#fff' }
                  ]}>
                    {t.upcoming || 'Upcoming'}
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { borderColor },
                    filterType === 'recurring' && { backgroundColor: accentColor, borderColor: accentColor }
                  ]}
                  onPress={() => setFilterType('recurring')}
                >
                  <Ionicons 
                    name="repeat-outline" 
                    size={20} 
                    color={filterType === 'recurring' ? '#fff' : textColor} 
                  />
                  <ThemedText style={[
                    styles.filterOptionText,
                    filterType === 'recurring' && { color: '#fff' }
                  ]}>
                    {t.recurring || 'Recurring'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterSection}>
              <ThemedText style={styles.filterSectionTitle}>{t.attendees || 'Attendees'}</ThemedText>
              <View style={styles.filterOptionsGrid}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { borderColor },
                    attendeeFilter === 'all' && { backgroundColor: accentColor, borderColor: accentColor }
                  ]}
                  onPress={() => setAttendeeFilter('all')}
                >
                  <ThemedText style={[
                    styles.filterOptionText,
                    attendeeFilter === 'all' && { color: '#fff' }
                  ]}>
                    {t.all || 'All'}
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { borderColor },
                    attendeeFilter === 'everyone' && { backgroundColor: accentColor, borderColor: accentColor }
                  ]}
                  onPress={() => setAttendeeFilter('everyone')}
                >
                  <ThemedText style={[
                    styles.filterOptionText,
                    attendeeFilter === 'everyone' && { color: '#fff' }
                  ]}>
                    {t.everyone || 'Everyone'}
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { borderColor },
                    attendeeFilter === 'men' && { backgroundColor: accentColor, borderColor: accentColor }
                  ]}
                  onPress={() => setAttendeeFilter('men')}
                >
                  <ThemedText style={[
                    styles.filterOptionText,
                    attendeeFilter === 'men' && { color: '#fff' }
                  ]}>
                    {t.men || 'Men'}
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { borderColor },
                    attendeeFilter === 'women' && { backgroundColor: accentColor, borderColor: accentColor }
                  ]}
                  onPress={() => setAttendeeFilter('women')}
                >
                  <ThemedText style={[
                    styles.filterOptionText,
                    attendeeFilter === 'women' && { color: '#fff' }
                  ]}>
                    {t.women || 'Women'}
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { borderColor },
                    attendeeFilter === 'youth' && { backgroundColor: accentColor, borderColor: accentColor }
                  ]}
                  onPress={() => setAttendeeFilter('youth')}
                >
                  <ThemedText style={[
                    styles.filterOptionText,
                    attendeeFilter === 'youth' && { color: '#fff' }
                  ]}>
                    {t.youth || 'Youth'}
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { borderColor },
                    attendeeFilter === 'children' && { backgroundColor: accentColor, borderColor: accentColor }
                  ]}
                  onPress={() => setAttendeeFilter('children')}
                >
                  <ThemedText style={[
                    styles.filterOptionText,
                    attendeeFilter === 'children' && { color: '#fff' }
                  ]}>
                    {t.children || 'Children'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.clearButton, { borderColor }]}
                onPress={() => {
                  setFilterType('all');
                  setAttendeeFilter('all');
                }}
              >
                <ThemedText style={styles.clearButtonText}>{t.clearAll || 'Clear All'}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: accentColor }]}
                onPress={() => setShowFilterModal(false)}
              >
                <ThemedText style={styles.applyButtonText}>{t.apply || 'Apply'}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerWrapper: {
    backgroundColor: 'transparent',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight || 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    gap: 4,
  },
  headerEdgeEffect: {
    flexDirection: 'column',
  },
  headerEdgeGradient: {
    height: 1,
    opacity: 0.15,
  },
  scrollView: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.37,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.4,
  },
  eventCountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  eventCountText: {
    fontSize: 16,
    fontWeight: '600',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  filterDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  filterDropdownText: {
    fontSize: 15,
    fontWeight: '500',
  },
  filterDropdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayTouch: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  filterSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 100,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  eventsList: {
    paddingVertical: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});
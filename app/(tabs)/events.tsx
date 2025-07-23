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
  Dimensions
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

  const FilterButton: React.FC<{
    label: string;
    value: string;
    currentValue: string;
    onPress: () => void;
    icon?: string;
  }> = ({ label, value, currentValue, onPress, icon }) => {
    const isSelected = value === currentValue;
    return (
      <TouchableOpacity
        style={[
          styles.filterButton,
          { 
            borderColor: isSelected ? accentColor : borderColor,
            backgroundColor: isSelected ? accentColor + '15' : 'transparent',
          }
        ]}
        onPress={onPress}
      >
        {icon && (
          <Ionicons 
            name={icon as any} 
            size={16} 
            color={isSelected ? accentColor : textColor} 
            style={styles.filterIcon}
          />
        )}
        <ThemedText 
          style={[
            styles.filterButtonText,
            { color: isSelected ? accentColor : textColor }
          ]}
        >
          {label}
        </ThemedText>
      </TouchableOpacity>
    );
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

        <View style={styles.filtersSection}>
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={60}
              tint={colorScheme === "dark" ? "dark" : "light"}
              style={[styles.filterCard, { borderColor }]}
            >
              <View style={styles.filterHeader}>
                <Ionicons name="calendar-outline" size={18} color={textColor} />
                <ThemedText style={styles.filterTitle}>{t.filterBy}</ThemedText>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
              >
              <View style={styles.filterOptions}>
                <FilterButton
                  label={t.all}
                  value="all"
                  currentValue={filterType}
                  onPress={() => setFilterType('all')}
                  icon="list-outline"
                />
                <FilterButton
                  label={t.today}
                  value="today"
                  currentValue={filterType}
                  onPress={() => setFilterType('today')}
                  icon="today-outline"
                />
                <FilterButton
                  label={t.upcoming}
                  value="upcoming"
                  currentValue={filterType}
                  onPress={() => setFilterType('upcoming')}
                  icon="arrow-forward-circle-outline"
                />
                <FilterButton
                  label={t.recurring}
                  value="recurring"
                  currentValue={filterType}
                  onPress={() => setFilterType('recurring')}
                  icon="repeat-outline"
                />
              </View>
            </ScrollView>
            </BlurView>
          ) : (
            <View style={[styles.filterCard, { backgroundColor: surfaceColor, borderColor }]}>
              <View style={styles.filterHeader}>
                <Ionicons name="calendar-outline" size={18} color={textColor} />
                <ThemedText style={styles.filterTitle}>{t.filterBy}</ThemedText>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
              >
                <View style={styles.filterOptions}>
                  <FilterButton
                    label={t.all}
                    value="all"
                    currentValue={filterType}
                    onPress={() => setFilterType('all')}
                    icon="list-outline"
                  />
                  <FilterButton
                    label={t.today}
                    value="today"
                    currentValue={filterType}
                    onPress={() => setFilterType('today')}
                    icon="today-outline"
                  />
                  <FilterButton
                    label={t.upcoming}
                    value="upcoming"
                    currentValue={filterType}
                    onPress={() => setFilterType('upcoming')}
                    icon="arrow-forward-circle-outline"
                  />
                  <FilterButton
                    label={t.recurring}
                    value="recurring"
                    currentValue={filterType}
                    onPress={() => setFilterType('recurring')}
                    icon="repeat-outline"
                  />
                </View>
              </ScrollView>
            </View>
          )}

          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={60}
              tint={colorScheme === "dark" ? "dark" : "light"}
              style={[styles.filterCard, { borderColor }]}
            >
              <View style={styles.filterHeader}>
                <Ionicons name="people-outline" size={18} color={textColor} />
                <ThemedText style={styles.filterTitle}>{t.attendees}</ThemedText>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
              >
              <View style={styles.filterOptions}>
                <FilterButton
                  label={t.all}
                  value="all"
                  currentValue={attendeeFilter}
                  onPress={() => setAttendeeFilter('all')}
                />
                <FilterButton
                  label={t.everyone}
                  value="everyone"
                  currentValue={attendeeFilter}
                  onPress={() => setAttendeeFilter('everyone')}
                />
                <FilterButton
                  label={t.men}
                  value="men"
                  currentValue={attendeeFilter}
                  onPress={() => setAttendeeFilter('men')}
                />
                <FilterButton
                  label={t.women}
                  value="women"
                  currentValue={attendeeFilter}
                  onPress={() => setAttendeeFilter('women')}
                />
                <FilterButton
                  label={t.youth}
                  value="youth"
                  currentValue={attendeeFilter}
                  onPress={() => setAttendeeFilter('youth')}
                />
                <FilterButton
                  label={t.children}
                  value="children"
                  currentValue={attendeeFilter}
                  onPress={() => setAttendeeFilter('children')}
                />
              </View>
            </ScrollView>
            </BlurView>
          ) : (
            <View style={[styles.filterCard, { backgroundColor: surfaceColor, borderColor }]}>
              <View style={styles.filterHeader}>
                <Ionicons name="people-outline" size={18} color={textColor} />
                <ThemedText style={styles.filterTitle}>{t.attendees}</ThemedText>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
              >
                <View style={styles.filterOptions}>
                  <FilterButton
                    label={t.all}
                    value="all"
                    currentValue={attendeeFilter}
                    onPress={() => setAttendeeFilter('all')}
                  />
                  <FilterButton
                    label={t.everyone}
                    value="everyone"
                    currentValue={attendeeFilter}
                    onPress={() => setAttendeeFilter('everyone')}
                  />
                  <FilterButton
                    label={t.men}
                    value="men"
                    currentValue={attendeeFilter}
                    onPress={() => setAttendeeFilter('men')}
                  />
                  <FilterButton
                    label={t.women}
                    value="women"
                    currentValue={attendeeFilter}
                    onPress={() => setAttendeeFilter('women')}
                  />
                  <FilterButton
                    label={t.youth}
                    value="youth"
                    currentValue={attendeeFilter}
                    onPress={() => setAttendeeFilter('youth')}
                  />
                  <FilterButton
                    label={t.children}
                    value="children"
                    currentValue={attendeeFilter}
                    onPress={() => setAttendeeFilter('children')}
                  />
                </View>
              </ScrollView>
            </View>
          )}
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
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 24) + 8,
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
  filtersSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  filterCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        backgroundColor: 'transparent',
      },
      android: {
        elevation: 2,
      },
    }),
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  filterScroll: {
    paddingHorizontal: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterIcon: {
    marginRight: 2,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
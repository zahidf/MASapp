import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EventCard } from '@/components/events/EventCard';
import { useEvents } from '@/contexts/EventsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';

export const HomePageEvents: React.FC = () => {
  const { homePageEvents, loading } = useEvents();
  const { t } = useLanguage();
  const router = useRouter();
  const colorScheme = useColorScheme();
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'tint');
  const surfaceColor = useThemeColor({}, 'surface');

  if (loading || homePageEvents.length === 0) {
    return null;
  }

  const handleSeeAll = () => {
    router.push('/(tabs)/events');
  };

  const maxEventsToShow = 3;
  const eventsToDisplay = homePageEvents.slice(0, maxEventsToShow);
  const hasMoreEvents = homePageEvents.length > maxEventsToShow;

  const EventsContent = () => (
    <>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: textColor }]}>
          {t.upcomingEvents}
        </ThemedText>
        <TouchableOpacity onPress={handleSeeAll} style={styles.seeAllButton}>
          <ThemedText style={[styles.seeAllText, { color: accentColor }]}>
            {t.seeAll}
          </ThemedText>
          <Ionicons name="chevron-forward" size={16} color={accentColor} />
        </TouchableOpacity>
      </View>

      <View style={styles.eventsList}>
        {eventsToDisplay.map((event, index) => (
          <View key={event.id} style={styles.eventWrapper}>
            <EventCard 
              event={event} 
              expanded={false}
              onPress={() => router.push('/(tabs)/events')}
            />
          </View>
        ))}
      </View>

      {hasMoreEvents && (
        <TouchableOpacity 
          style={[styles.moreEventsButton, { backgroundColor: accentColor + '10' }]}
          onPress={handleSeeAll}
        >
          <ThemedText style={[styles.moreEventsText, { color: accentColor }]}>
            +{homePageEvents.length - maxEventsToShow} {t.moreEvents}
          </ThemedText>
        </TouchableOpacity>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={60}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={[
            styles.card,
            {
              backgroundColor: surfaceColor + "95",
              borderColor:
                colorScheme === "dark"
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
            },
          ]}
        >
          <EventsContent />
        </BlurView>
      ) : (
        <View
          style={[
            styles.card,
            {
              backgroundColor: surfaceColor,
              borderColor:
                colorScheme === "dark"
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
            },
          ]}
        >
          <EventsContent />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 15,
    fontWeight: '500',
  },
  eventsList: {
    paddingBottom: 8,
  },
  eventWrapper: {
    marginBottom: 8,
  },
  moreEventsButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  moreEventsText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
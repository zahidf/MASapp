import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useThemeColor } from '@/hooks/useThemeColor';
import { FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import { QiblaCalibrationModal } from '@/components/qibla/QiblaCalibrationModal';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';

let Location: any;
let Magnetometer: any;
let DeviceMotion: any;

try {
  Location = require('expo-location');
  Magnetometer = require('expo-sensors').Magnetometer;
  DeviceMotion = require('expo-sensors').DeviceMotion;
} catch (error) {
  console.log('Location, Magnetometer or DeviceMotion modules not available');
}

// Type definitions
interface HeadingData {
  trueHeading: number;
  magHeading: number;
  accuracy: number;
}

interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface LocationData {
  coords: LocationCoords;
}

interface DeviceMotionData {
  rotation?: {
    alpha?: number;
    beta?: number;
    gamma?: number;
  };
  rotationRate?: {
    alpha?: number;
    beta?: number;
    gamma?: number;
  };
  acceleration?: {
    x?: number;
    y?: number;
    z?: number;
  };
  accelerationIncludingGravity?: {
    x?: number;
    y?: number;
    z?: number;
  };
  interval: number;
  orientation?: number;
}

const { width } = Dimensions.get('window');

export default function QiblaScreen() {
  const [heading, setHeading] = useState(0);
  const [qiblaDirection, setQiblaDirection] = useState(0);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [headingSubscription, setHeadingSubscription] = useState<any>(null);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const hasShownCalibrationModal = useRef(false);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [headingAccuracy, setHeadingAccuracy] = useState<number | null>(null);
  const [usingTrueHeading, setUsingTrueHeading] = useState(false);
  const [deviceMotionSubscription, setDeviceMotionSubscription] = useState<any>(null);
  const [isPhoneFlat, setIsPhoneFlat] = useState(true);
  const [showFlatSurfaceWarning, setShowFlatSurfaceWarning] = useState(false);
  
  const compassRotation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const headerSlideAnim = useRef(new Animated.Value(50)).current;
  const cardSlideAnim = useRef(new Animated.Value(30)).current;
  const warningSlideAnim = useRef(new Animated.Value(-100)).current;
  const warningOpacityAnim = useRef(new Animated.Value(0)).current;
  
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const primaryColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  // Kaaba coordinates (exact location as used by Google)
  const KAABA_LAT = 21.4224779;
  const KAABA_LON = 39.8251832;

  // Calculate Qibla direction using great-circle distance (haversine formula)
  const calculateQibla = (lat: number, lon: number) => {
    const toRadians = (deg: number) => deg * (Math.PI / 180);
    const toDegrees = (rad: number) => rad * (180 / Math.PI);

    const lat1 = toRadians(lat);
    const lon1 = toRadians(lon);
    const lat2 = toRadians(KAABA_LAT);
    const lon2 = toRadians(KAABA_LON);

    const dLon = lon2 - lon1;

    // Calculate bearing using great-circle route
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    const bearing = toDegrees(Math.atan2(y, x));
    
    // Normalize to 0-360 degrees
    return (bearing + 360) % 360;
  };

  // Calculate distance to Kaaba (for display)
  const calculateDistance = (lat: number, lon: number) => {
    const toRadians = (deg: number) => deg * (Math.PI / 180);
    
    const R = 6371; // Earth's radius in km
    const dLat = toRadians(KAABA_LAT - lat);
    const dLon = toRadians(KAABA_LON - lon);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRadians(lat)) * Math.cos(toRadians(KAABA_LAT)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Setup device motion monitoring
  const setupDeviceMotion = async () => {
    if (!DeviceMotion) return;
    
    try {
      const available = await DeviceMotion.isAvailableAsync();
      if (!available) return;

      DeviceMotion.setUpdateInterval(1000); // Update every second
      
      const subscription = DeviceMotion.addListener((motionData: DeviceMotionData) => {
        if (motionData.rotation) {
          // Check if phone is flat (beta is pitch, gamma is roll)
          const pitch = Math.abs(motionData.rotation.beta || 0);
          const roll = Math.abs(motionData.rotation.gamma || 0);
          
          // Phone is considered flat if pitch and roll are less than 15 degrees
          const isFlat = pitch < 0.26 && roll < 0.26; // 0.26 radians = ~15 degrees
          
          setIsPhoneFlat(isFlat);
          
          // Show warning if not flat
          if (!isFlat && !showFlatSurfaceWarning) {
            setShowFlatSurfaceWarning(true);
          } else if (isFlat && showFlatSurfaceWarning) {
            // Hide warning after 2 seconds when phone becomes flat
            setTimeout(() => {
              setShowFlatSurfaceWarning(false);
            }, 2000);
          }
        }
      });

      setDeviceMotionSubscription(subscription);
    } catch (error) {
      console.log('Device motion setup error:', error);
    }
  };

  // Setup heading updates (uses CLLocationManager on iOS for true heading)
  const setupHeadingUpdates = async () => {
    try {
      // For iOS, use Location.watchHeadingAsync which provides true heading
      if (Platform.OS === 'ios') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Location permission not granted');
        }

        // Watch heading updates - this uses CLLocationManager internally
        const subscription = await Location.watchHeadingAsync(
          (headingData: HeadingData) => {
            // Use trueHeading if available (requires location services)
            // Falls back to magneticHeading if trueHeading is unavailable
            const heading = headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading;
            setHeading(Math.round(heading));
            setUsingTrueHeading(headingData.trueHeading >= 0);
            setHeadingAccuracy(headingData.accuracy);
            
            // Consider calibrated if accuracy is good (lower is better)
            if (headingData.accuracy >= 0 && headingData.accuracy <= 50) {
              setIsCalibrated(true);
            }
          }
        );
        
        setHeadingSubscription(subscription);
      } else {
        // For Android, continue using magnetometer
        // (Android's SensorManager provides declination-corrected values automatically)
        const available = await Magnetometer.isAvailableAsync();
        if (!available) {
          throw new Error('Magnetometer not available');
        }

        Magnetometer.setUpdateInterval(16);
        
        const sub = Magnetometer.addListener((data: { x: number; y: number; z: number }) => {
          let angle = Math.atan2(data.y, data.x);
          angle = angle * (180 / Math.PI);
          angle = angle + 90;
          angle = (angle + 360) % 360;
          
          setHeading(Math.round(angle));
          setUsingTrueHeading(false); // Android magnetometer gives magnetic heading
          
          // Check if calibrated based on magnetometer stability
          const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
          if (magnitude > 25 && magnitude < 65) {
            setIsCalibrated(true);
          }
        });

        setSubscription(sub);
      }
    } catch (error) {
      console.error('Error setting up heading updates:', error);
      throw error;
    }
  };

  useEffect(() => {
    (async () => {
      try {
        // Check if modules are available
        if (!Location) {
          Alert.alert(
            'Module Not Available', 
            'Location features require a development build. Please run "npx expo run:ios" or "npx expo run:android" to build the app with native modules.'
          );
          setLoading(false);
          return;
        }

        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required to find Qibla direction');
          setLoading(false);
          return;
        }

        // Get current location with high accuracy
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(location);
        setAccuracy(location.coords.accuracy || 0);

        // Calculate Qibla direction
        const qibla = calculateQibla(location.coords.latitude, location.coords.longitude);
        setQiblaDirection(qibla);

        // Setup heading updates (true heading on iOS, magnetic on Android)
        await setupHeadingUpdates();
        
        // Setup device motion monitoring
        await setupDeviceMotion();

        // Check calibration after 3 seconds
        setTimeout(() => {
          console.log('Qibla: Checking calibration - isCalibrated:', isCalibrated, 'hasShownModal:', hasShownCalibrationModal.current);
          // Always show calibration modal on first load unless already calibrated
          if (!hasShownCalibrationModal.current) {
            console.log('Qibla: Showing calibration modal');
            setShowCalibrationModal(true);
            hasShownCalibrationModal.current = true;
          }
        }, 3000);

        setLoading(false);
        
        // Fade in animations
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(headerSlideAnim, {
            toValue: 0,
            tension: 65,
            friction: 10,
            useNativeDriver: true,
          }),
          Animated.spring(cardSlideAnim, {
            toValue: 0,
            tension: 65,
            friction: 10,
            delay: 100,
            useNativeDriver: true,
          }),
        ]).start();
      } catch (error) {
        console.error('Error setting up Qibla:', error);
        Alert.alert('Error', 'Failed to set up Qibla compass. Make sure you are using a development build with location services enabled.');
        setLoading(false);
      }
    })();

    return () => {
      subscription?.remove();
      headingSubscription?.remove();
      deviceMotionSubscription?.remove();
    };
  }, []);

  const getRotation = () => {
    return 360 - heading + qiblaDirection;
  };

  const getDirection = () => {
    const diff = (qiblaDirection - heading + 360) % 360;
    if (diff < 5 || diff > 355) {
      // Start pulse animation when facing Qibla
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ]),
      ).start();
      return 'Facing Qibla ✓';
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
    
    if (diff < 180) return `Turn ${Math.round(diff)}° Right →`;
    return `← Turn ${Math.round(360 - diff)}° Left`;
  };

  // Smooth compass rotation animation
  useEffect(() => {
    Animated.timing(compassRotation, {
      toValue: 360 - heading + qiblaDirection,
      duration: 100,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [heading, qiblaDirection]);


  // Handle flat surface warning animations
  useEffect(() => {
    if (showFlatSurfaceWarning) {
      Animated.parallel([
        Animated.spring(warningSlideAnim, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(warningOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(warningSlideAnim, {
          toValue: -100,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(warningOpacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showFlatSurfaceWarning]);


  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text + "80" }]}>
            Finding Qibla direction...
          </Text>
        </View>
      </ThemedView>
    );
  }

  const isFacingQibla = () => {
    const diff = (qiblaDirection - heading + 360) % 360;
    return diff < 5 || diff > 355;
  };

  return (
    <ThemedView style={styles.container}>
      <QiblaCalibrationModal 
        showCalibrationModal={showCalibrationModal}
        setShowCalibrationModal={setShowCalibrationModal}
        colors={colors}
        colorScheme={colorScheme}
      />
      
      {/* Flat Surface Warning */}
      <Animated.View
        style={[
          styles.flatSurfaceWarning,
          {
            transform: [{ translateY: warningSlideAnim }],
            opacity: warningOpacityAnim,
          },
        ]}
        pointerEvents={showFlatSurfaceWarning ? 'auto' : 'none'}
      >
        <BlurView
          intensity={100}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={[
            styles.warningContainer,
            {
              backgroundColor: colors.notification + "f5",
              borderColor: colors.notification + "40",
            },
          ]}
        >
          <IconSymbol name="exclamationmark.triangle.fill" size={20} color={colors.notification} />
          <Text style={[styles.warningText, { color: colors.text }]}>
            Place phone on a flat surface for accurate direction
          </Text>
        </BlurView>
      </Animated.View>
      
      {/* iOS-style Header */}
      <View style={styles.headerWrapper}>
        <BlurView
          intensity={85}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={styles.header}
        >
          <Animated.View
            style={[
              styles.headerContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: headerSlideAnim }],
              },
            ]}
          >
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Qibla Direction
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.text + "80" }]}>
              {location ? `${Math.round(calculateDistance(location.coords.latitude, location.coords.longitude))} km from Makkah` : 'Locating...'}
            </Text>
          </Animated.View>
        </BlurView>
        <View style={styles.headerEdgeEffect}>
          <View
            style={[
              styles.headerEdgeGradient,
              {
                backgroundColor: colorScheme === "dark"
                  ? "rgba(0,0,0,0.1)"
                  : "rgba(255,255,255,0.3)",
              },
            ]}
          />
        </View>
      </View>
      
      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: cardSlideAnim }],
            },
          ]}
        >
        <BlurView
          intensity={60}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={[
            styles.compassCard,
            {
              backgroundColor: colors.surface + "95",
              borderColor: colorScheme === "dark"
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
            },
          ]}
        >
          <View style={styles.compassContainer}>
            <View style={[
              styles.compass,
              { 
                borderColor: isFacingQibla() ? colors.tint : colors.text + "20",
                backgroundColor: colorScheme === "dark" ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
              }
            ]}>
              {/* Animated Kaaba icon */}
              <Animated.View style={[
                styles.arrow,
                {
                  transform: [
                    { rotate: compassRotation.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg']
                    })},
                    { scale: isFacingQibla() ? pulseAnim : 1 }
                  ]
                }
              ]}>
                <View style={[
                  styles.kaabaIconContainer,
                  { backgroundColor: isFacingQibla() ? colors.tint + "15" : 'transparent' }
                ]}>
                  <FontAwesome5 name="kaaba" size={50} color={isFacingQibla() ? colors.tint : colors.text + "60"} />
                </View>
              </Animated.View>
            
              {/* Direction indicators */}
              <View style={styles.directionIndicators}>
                <Text style={[styles.direction, styles.north, { color: colors.text + "40" }]}>N</Text>
                <Text style={[styles.direction, styles.east, { color: colors.text + "40" }]}>E</Text>
                <Text style={[styles.direction, styles.south, { color: colors.text + "40" }]}>S</Text>
                <Text style={[styles.direction, styles.west, { color: colors.text + "40" }]}>W</Text>
              </View>
              
              {/* Accuracy indicator */}
              {accuracy > 0 && (
                <View style={[
                  styles.accuracyIndicator,
                  { backgroundColor: accuracy < 20 ? colors.tint : colors.text + "40" }
                ]} />
              )}
            </View>
          </View>
          
          {/* Direction Text */}
          <Text style={[
            styles.directionText,
            { color: isFacingQibla() ? colors.tint : colors.text }
          ]}>
            {getDirection()}
          </Text>
          
          {/* Compass Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: colors.tint + "10" }]}>
                <IconSymbol name="location.fill" size={18} color={colors.tint} />
              </View>
              <Text style={[styles.detailLabel, { color: colors.text + "60" }]}>Qibla</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{Math.round(qiblaDirection)}°</Text>
            </View>
            
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: colors.text + "10" }]}>
                <IconSymbol name="chevron.up" size={18} color={colors.text + "60"} />
              </View>
              <Text style={[styles.detailLabel, { color: colors.text + "60" }]}>Heading</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{heading}°</Text>
            </View>
            
          </View>
        </BlurView>

        {/* Flat Surface Card */}
        <View
          style={[
            styles.surfaceCard,
            {
              backgroundColor: isPhoneFlat ? colors.tint + "10" : colors.notification + "10",
              borderColor: isPhoneFlat ? colors.tint + "20" : colors.notification + "20",
            },
          ]}
        >
          <View style={styles.surfaceCardContent}>
            <View style={styles.surfaceCardHeader}>
              <IconSymbol 
                name={isPhoneFlat ? "checkmark.circle.fill" : "exclamationmark.triangle.fill"} 
                size={24} 
                color={isPhoneFlat ? colors.tint : colors.notification} 
              />
              <Text style={[
                styles.surfaceCardTitle, 
                { color: isPhoneFlat ? colors.tint : colors.notification }
              ]}>
                {isPhoneFlat ? 'Phone Position Good' : 'Not on Flat Surface'}
              </Text>
            </View>
            <Text style={[styles.surfaceCardText, { color: colors.text + "80" }]}>
              {isPhoneFlat 
                ? 'Your phone is positioned correctly for accurate Qibla direction'
                : 'Place your phone on a flat, stable surface for accurate compass readings'}
            </Text>
          </View>
        </View>

        {/* Calibration Hint */}
        <TouchableOpacity
          style={[
            styles.calibrateCard,
            {
              backgroundColor: colors.text + "08",
              borderColor: colors.text + "15",
            },
          ]}
          onPress={() => {
            console.log('Calibration hint button pressed');
            setShowCalibrationModal(true);
          }}
        >
          <IconSymbol name="info.circle.fill" size={20} color={colors.text + "60"} />
          <Text style={[styles.calibrateHintText, { color: colors.text + "80" }]}>
            {isCalibrated ? 'Compass Calibrated' : 'Tap for calibration tips'}
          </Text>
        </TouchableOpacity>
        
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header styles
  headerWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : StatusBar.currentHeight || 24,
    paddingBottom: 20,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
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
    marginTop: 4,
  },
  headerEdgeEffect: {
    height: 1,
  },
  headerEdgeGradient: {
    height: 1,
  },
  
  // ScrollView styles
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  
  // Content styles
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  
  // Compass card styles
  compassCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  compassContainer: {
    alignItems: 'center',
  },
  compass: {
    width: Math.min(width - 112, 280),
    height: Math.min(width - 112, 280),
    borderRadius: Math.min(width - 112, 280) / 2,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  arrow: {
    position: 'absolute',
    zIndex: 10,
  },
  kaabaIconContainer: {
    padding: 20,
    borderRadius: 40,
  },
  directionIndicators: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  direction: {
    position: 'absolute',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  north: {
    top: 12,
    left: '50%',
    marginLeft: -8,
  },
  east: {
    right: 12,
    top: '50%',
    marginTop: -11,
  },
  south: {
    bottom: 12,
    left: '50%',
    marginLeft: -8,
  },
  west: {
    left: 12,
    top: '50%',
    marginTop: -11,
  },
  accuracyIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  directionText: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
    marginTop: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  
  // Details styles
  detailsContainer: {
    marginTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.2,
    flex: 1,
  },
  detailValue: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  
  // Calibration card styles
  calibrateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  calibrateHintText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  
  // Flat surface card styles
  surfaceCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  surfaceCardContent: {
    gap: 8,
  },
  surfaceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  surfaceCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  surfaceCardText: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  
  // Flat surface warning styles
  flatSurfaceWarning: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  
  // Quick actions styles
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
});
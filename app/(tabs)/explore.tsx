import { Asset } from "expo-asset";
import { BlurView } from "expo-blur";
import React from "react";
import {
  Alert,
  Animated,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SvgXml } from "react-native-svg";

import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface MenuItem {
  title: string;
  subtitle: string;
  icon: string;
  action: () => void;
  color?: string;
  destructive?: boolean;
}

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [headerAnim] = React.useState(new Animated.Value(0));
  const [logoSvg, setLogoSvg] = React.useState<string>("");

  React.useEffect(() => {
    // Load SVG logo
    const loadLogo = async () => {
      try {
        const asset = Asset.fromModule(
          require("@/assets/logos/mosqueLogo.svg")
        );
        await asset.downloadAsync();
        const response = await fetch(asset.localUri || asset.uri);
        const svgContent = await response.text();
        setLogoSvg(svgContent);
      } catch (error) {
        // Error loading logo
      }
    };
    loadLogo();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(headerAnim, {
        toValue: 1,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleOpenMaps = () => {
    const shareLink = "https://maps.app.goo.gl/SGEfXk43yyqWY6Cu7";
    const address = "Grove St, Smethwick, Birmingham B66 2QS";
    const encodedAddress = encodeURIComponent(address);

    Alert.alert("Get Directions", "Choose how to open directions:", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Google Maps",
        onPress: () => Linking.openURL(shareLink),
      },
      {
        text: "Default Maps",
        onPress: () => {
          if (Platform.OS === "ios") {
            Linking.openURL(`maps:0,0?q=${encodedAddress}`);
          } else {
            Linking.openURL(`geo:0,0?q=${encodedAddress}`);
          }
        },
      },
    ]);
  };

  const handleCall = () => {
    Alert.alert("Contact Mosque", "Would you like to call the mosque?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call",
        onPress: () => Linking.openURL("tel:+447973573059"),
      },
    ]);
  };

  const handleWebsite = () => {
    Linking.openURL("https://www.masjidabubakr.org.uk");
  };

  const handleFeedback = () => {
    Alert.alert(
      "Send Feedback",
      "Your feedback helps us improve the app. How would you like to send feedback?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Email",
          onPress: () =>
            Linking.openURL(
              "mailto:feedback@masjidabubakr.org.uk?subject=Prayer%20Times%20App%20Feedback"
            ),
        },
      ]
    );
  };

  const handleDonate = () => {
    Alert.alert(
      "Support the Mosque",
      "Donation feature is coming soon! Thank you for your interest in supporting the mosque.",
      [{ text: "OK" }]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      "About This App",
      "Masjid Abubakr Siddique App v1.0.0\n\nDeveloped for Masjid Abubakr Siddique to provide accurate prayer times and mosque information to the community.\n\n© 2025 Masjid Abubakr Siddique",
      [{ text: "OK" }]
    );
  };

  const menuSections: MenuSection[] = [
    {
      title: "Mosque Information",
      items: [
        {
          title: "Location & Directions",
          subtitle: "Grove St, Smethwick, Birmingham",
          icon: "location.fill",
          action: handleOpenMaps,
        },
        {
          title: "Contact Us",
          subtitle: "Call the mosque directly",
          icon: "phone.fill",
          action: handleCall,
        },
        {
          title: "Visit Website",
          subtitle: "Learn more about our community",
          icon: "globe",
          action: handleWebsite,
        },
      ],
    },
    {
      title: "Community",
      items: [
        {
          title: "Support the Mosque",
          subtitle: "Donation feature coming soon",
          icon: "heart.fill",
          action: handleDonate,
        },
        {
          title: "Send Feedback",
          subtitle: "Help us improve the app",
          icon: "envelope.fill",
          action: handleFeedback,
        },
      ],
    },
    {
      title: "About",
      items: [
        {
          title: "About This App",
          subtitle: "Version 1.0.0",
          icon: "info.circle.fill",
          action: handleAbout,
        },
      ],
    },
  ];

  const renderMenuItem = (item: MenuItem, isLast: boolean) => (
    <TouchableOpacity
      key={item.title}
      style={[
        styles.menuItem,
        isLast && styles.lastMenuItem,
        item.destructive && styles.destructiveMenuItem,
      ]}
      onPress={item.action}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.menuItemIcon,
          {
            backgroundColor: item.color
              ? `${item.color}15`
              : `${colors.tint}15`,
          },
        ]}
      >
        <IconSymbol
          name={item.icon as any}
          size={22}
          color={item.destructive ? colors.error : item.color || colors.tint}
        />
      </View>
      <View style={styles.menuItemContent}>
        <Text
          style={[
            styles.menuItemTitle,
            { color: item.destructive ? colors.error : colors.text },
          ]}
        >
          {item.title}
        </Text>
        <Text style={[styles.menuItemSubtitle, { color: colors.text + "60" }]}>
          {item.subtitle}
        </Text>
      </View>
      <IconSymbol name="chevron.right" size={18} color={colors.text + "30"} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      {/* Enhanced iOS-style Header with Blur */}
      <Animated.View
        style={[
          styles.headerWrapper,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
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
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              More
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: colors.text + "80" }]}
            >
              Mosque information and app settings
            </Text>
          </View>
        </BlurView>

        {/* Header edge effect */}
        <View style={styles.headerEdgeEffect}>
          <View
            style={[
              styles.headerEdgeGradient,
              {
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(0,0,0,0.2)"
                    : "rgba(0,0,0,0.08)",
              },
            ]}
          />
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Mosque Info Card - Redesigned for iOS consistency */}
          <BlurView
            intensity={60}
            tint={colorScheme === "dark" ? "dark" : "light"}
            style={[
              styles.mosqueCard,
              {
                backgroundColor: colors.surface + "95",
                borderColor:
                  colorScheme === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
              },
            ]}
          >
            <View style={styles.mosqueHeader}>
              <View
                style={[
                  styles.mosqueIconContainer,
                  { backgroundColor: colors.tint + "15" },
                ]}
              >
                {logoSvg ? (
                  <SvgXml xml={logoSvg} width={48} height={48} />
                ) : (
                  <IconSymbol
                    name="building.2.fill"
                    size={32}
                    color={colors.tint}
                  />
                )}
              </View>
            </View>

            <Text style={[styles.mosqueTitle, { color: colors.text }]}>
              Masjid Abubakr Siddique
            </Text>
            <Text style={[styles.mosqueAddress, { color: colors.text + "60" }]}>
              Grove St, Smethwick, Birmingham B66 2QS
            </Text>

            <View style={styles.mosqueStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.tint }]}>
                  5
                </Text>
                <Text style={[styles.statLabel, { color: colors.text + "60" }]}>
                  Daily Prayers
                </Text>
              </View>
              <View
                style={[
                  styles.statDivider,
                  { backgroundColor: colors.text + "10" },
                ]}
              />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.tint }]}>
                  365
                </Text>
                <Text style={[styles.statLabel, { color: colors.text + "60" }]}>
                  Days Open
                </Text>
              </View>
              <View
                style={[
                  styles.statDivider,
                  { backgroundColor: colors.text + "10" },
                ]}
              />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.tint }]}>
                  ∞
                </Text>
                <Text style={[styles.statLabel, { color: colors.text + "60" }]}>
                  Blessings
                </Text>
              </View>
            </View>
          </BlurView>

          {/* Menu Sections - iOS-style grouped lists */}
          {menuSections.map((section, sectionIndex) => (
            <View key={section.title} style={styles.menuSection}>
              <Text
                style={[styles.sectionTitle, { color: colors.text + "60" }]}
              >
                {section.title}
              </Text>
              <BlurView
                intensity={60}
                tint={colorScheme === "dark" ? "dark" : "light"}
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: colors.surface + "95",
                    borderColor:
                      colorScheme === "dark"
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                  },
                ]}
              >
                {section.items.map((item, index) =>
                  renderMenuItem(item, index === section.items.length - 1)
                )}
              </BlurView>
            </View>
          ))}

          {/* Footer - iOS-style centered text */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.text + "40" }]}>
              Masjid Abubakr Siddique App
            </Text>
            <Text style={[styles.footerVersion, { color: colors.text + "30" }]}>
              Version 1.1.1
            </Text>
            
            {__DEV__ && (
              <View style={styles.devFooter}>
                <Text style={styles.devText}>🔧 Development Build</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Enhanced iOS-style header
  headerWrapper: {
    backgroundColor: "transparent",
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  header: {
    paddingTop: Platform.OS === "ios" ? 60 : StatusBar.currentHeight || 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  headerEdgeEffect: {
    height: 1,
  },

  headerEdgeGradient: {
    height: 1,
    opacity: 0.15,
  },

  headerContent: {
    gap: 4,
  },

  headerTitle: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: 0.37,
  },

  headerSubtitle: {
    fontSize: 15,
    fontWeight: "400",
    letterSpacing: -0.4,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
  },

  // Mosque Card - iOS style
  mosqueCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
  },

  mosqueHeader: {
    marginBottom: 16,
  },

  mosqueIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  mosqueTitle: {
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: -0.4,
    marginBottom: 6,
    textAlign: "center",
  },

  mosqueAddress: {
    fontSize: 15,
    letterSpacing: -0.2,
    textAlign: "center",
    marginBottom: 20,
  },

  mosqueStats: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "space-around",
  },

  statItem: {
    alignItems: "center",
    flex: 1,
  },

  statValue: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 13,
    letterSpacing: -0.08,
    textAlign: "center",
  },

  statDivider: {
    width: 1,
    height: 40,
    opacity: 0.5,
  },

  // Menu Sections - iOS grouped style
  menuSection: {
    marginBottom: 35,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.08,
    textTransform: "uppercase",
    marginLeft: 32,
    marginBottom: 8,
  },

  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
    minHeight: 60,
  },

  lastMenuItem: {
    borderBottomWidth: 0,
  },

  destructiveMenuItem: {
    // For future use if needed
  },

  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  menuItemContent: {
    flex: 1,
    justifyContent: "center",
  },

  menuItemTitle: {
    fontSize: 17,
    fontWeight: "400",
    letterSpacing: -0.4,
    marginBottom: 2,
  },

  menuItemSubtitle: {
    fontSize: 13,
    letterSpacing: -0.08,
  },

  // Footer - iOS style
  footer: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  footerText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
    marginBottom: 4,
  },

  footerVersion: {
    fontSize: 13,
    letterSpacing: -0.08,
    marginBottom: 8,
  },

  footerSubtext: {
    fontSize: 13,
    letterSpacing: -0.08,
    textAlign: "center",
  },

  devFooter: {
    marginTop: 12,
    backgroundColor: "#FF9800",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },

  devText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
});

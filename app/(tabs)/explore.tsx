import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Alert,
  Animated,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
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
}

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleOpenMaps = () => {
    const address = "Masjid Abubakr Siddique, Birmingham, UK";
    const encodedAddress = encodeURIComponent(address);

    if (Platform.OS === "ios") {
      Linking.openURL(`maps:0,0?q=${encodedAddress}`);
    } else {
      Linking.openURL(`geo:0,0?q=${encodedAddress}`);
    }
  };

  const handleCall = () => {
    Alert.alert("Contact Mosque", "Would you like to call the mosque?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call",
        onPress: () => Linking.openURL("tel:+441234567890"),
      },
    ]);
  };

  const handleWebsite = () => {
    Linking.openURL("https://masjidabubakr.org.uk");
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
      "Thank you for considering a donation to support the mosque's activities.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Learn More",
          onPress: () => Linking.openURL("https://masjidabubakr.org.uk/donate"),
        },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      "About This App",
      "Prayer Times App v1.0.0\n\nDeveloped for Masjid Abubakr Siddique to provide accurate prayer times and mosque information to the community.\n\n© 2025 Masjid Abubakr Siddique",
      [{ text: "OK" }]
    );
  };

  const menuSections: MenuSection[] = [
    {
      title: "Mosque Information",
      items: [
        {
          title: "Location & Directions",
          subtitle: "Get directions to the mosque",
          icon: "location.fill",
          action: handleOpenMaps,
          color: "#1976D2",
        },
        {
          title: "Contact Us",
          subtitle: "Call the mosque directly",
          icon: "phone.fill",
          action: handleCall,
          color: "#388E3C",
        },
        {
          title: "Visit Website",
          subtitle: "Learn more about our community",
          icon: "globe",
          action: handleWebsite,
          color: "#7B1FA2",
        },
      ],
    },
    {
      title: "Community",
      items: [
        {
          title: "Support the Mosque",
          subtitle: "Make a donation",
          icon: "heart.fill",
          action: handleDonate,
          color: "#D32F2F",
        },
        {
          title: "Send Feedback",
          subtitle: "Help us improve the app",
          icon: "envelope.fill",
          action: handleFeedback,
          color: "#F57C00",
        },
      ],
    },
    {
      title: "App Information",
      items: [
        {
          title: "About",
          subtitle: "App version and information",
          icon: "info.circle.fill",
          action: handleAbout,
          color: "#5D4037",
        },
      ],
    },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.title}
      style={styles.menuItem}
      onPress={item.action}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.menuItemIcon,
          {
            backgroundColor:
              item.color || Colors[colorScheme ?? "light"].primary,
          },
        ]}
      >
        <IconSymbol name={item.icon as any} size={24} color="#fff" />
      </View>
      <View style={styles.menuItemContent}>
        <ThemedText style={styles.menuItemTitle}>{item.title}</ThemedText>
        <ThemedText style={styles.menuItemSubtitle}>{item.subtitle}</ThemedText>
      </View>
      <IconSymbol
        name="chevron.right"
        size={20}
        color={Colors[colorScheme ?? "light"].icon}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      {/* Enhanced Header */}
      <LinearGradient
        colors={
          colorScheme === "dark"
            ? ["#1B5E20", "#2E7D32", "#388E3C"]
            : ["#E8F5E9", "#C8E6C9", "#A5D6A7"]
        }
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <ThemedText type="title" style={styles.headerTitle}>
            More
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Mosque information and app settings
          </ThemedText>
        </View>

        {user && (
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <IconSymbol name="person.fill" size={24} color="#fff" />
            </View>
            <View style={styles.userDetails}>
              <ThemedText style={styles.userName}>{user.name}</ThemedText>
              <ThemedText style={styles.userRole}>
                {user.isAdmin ? "Administrator" : "Community Member"}
              </ThemedText>
            </View>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Mosque Info Card */}
          <ThemedView style={styles.mosqueCard}>
            <View style={styles.mosqueHeader}>
              <IconSymbol
                name="building.2"
                size={32}
                color={Colors[colorScheme ?? "light"].primary}
              />
              <View style={styles.mosqueInfo}>
                <ThemedText type="subtitle" style={styles.mosqueTitle}>
                  Masjid Abubakr Siddique
                </ThemedText>
                <ThemedText style={styles.mosqueAddress}>
                  Birmingham, United Kingdom
                </ThemedText>
              </View>
            </View>

            <View style={styles.mosqueStats}>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>5</ThemedText>
                <ThemedText style={styles.statLabel}>Daily Prayers</ThemedText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>365</ThemedText>
                <ThemedText style={styles.statLabel}>Days a Year</ThemedText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>∞</ThemedText>
                <ThemedText style={styles.statLabel}>Blessings</ThemedText>
              </View>
            </View>
          </ThemedView>

          {/* Menu Sections */}
          {menuSections.map((section, sectionIndex) => (
            <ThemedView key={section.title} style={styles.menuSection}>
              <ThemedText style={styles.sectionTitle}>
                {section.title}
              </ThemedText>
              {section.items.map(renderMenuItem)}
            </ThemedView>
          ))}

          {/* App Version Footer */}
          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              Prayer Times App v1.0.0
            </ThemedText>
            <ThemedText style={styles.footerSubtext}>
              Made with ❤️ for the Muslim community
            </ThemedText>
            {__DEV__ && (
              <View style={styles.devFooter}>
                <ThemedText style={styles.devText}>
                  🔧 Development Build
                </ThemedText>
              </View>
            )}
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 44 : StatusBar.currentHeight || 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  headerContent: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 16,
    borderRadius: 16,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  scrollContent: {
    flex: 1,
  },
  mosqueCard: {
    margin: 20,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  mosqueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  mosqueInfo: {
    flex: 1,
  },
  mosqueTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  mosqueAddress: {
    fontSize: 14,
    opacity: 0.7,
    fontWeight: "500",
  },
  mosqueStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.light.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: "600",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  menuSection: {
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    opacity: 0.8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
    padding: 20,
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.7,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    opacity: 0.5,
    fontWeight: "500",
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
  bottomSpacing: {
    height: Platform.OS === "ios" ? 100 : 80,
  },
});

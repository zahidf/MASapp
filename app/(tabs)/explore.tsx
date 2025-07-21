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
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SvgXml } from "react-native-svg";

import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Language, LANGUAGES } from "@/types/language";

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
  const { t, language, changeLanguage } = useLanguage();
  const { showSetupModal } = useNotificationContext();
  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [headerAnim] = React.useState(new Animated.Value(0));
  const [logoSvg, setLogoSvg] = React.useState<string>("");
  const [showLanguageMenu, setShowLanguageMenu] = React.useState(false);

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

    Alert.alert(t.explore.getDirections, t.explore.chooseDirections, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.explore.googleMaps,
        onPress: () => Linking.openURL(shareLink),
      },
      {
        text: t.explore.defaultMaps,
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
    Alert.alert(t.explore.contactMosque, t.explore.callMosquePrompt, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.explore.call,
        onPress: () => Linking.openURL("tel:+447973573059"),
      },
    ]);
  };

  const handleWebsite = () => {
    Linking.openURL("https://www.masjidabubakr.org.uk");
  };

  const handleFeedback = () => {
    Alert.alert(
      t.explore.sendFeedback,
      t.explore.feedbackPrompt,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.explore.email,
          onPress: () =>
            Linking.openURL(
              "mailto:inf.afghan@gmail.com?subject=Prayer%20Times%20App%20Feedback"
            ),
        },
      ]
    );
  };

  const handleDonate = () => {
    Alert.alert(
      t.explore.supportMosque,
      t.explore.donationMessage,
      [{ text: t.common.ok }]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      t.explore.about,
      t.explore.aboutMessage,
      [{ text: t.common.done }]
    );
  };

  const handleLanguageSelect = () => {
    setShowLanguageMenu(true);
  };

  const handleLanguageChange = async (newLanguage: Language) => {
    await changeLanguage(newLanguage);
    setShowLanguageMenu(false);
  };

  const handleNotificationSettings = () => {
    showSetupModal();
  };

  const menuSections: MenuSection[] = [
    {
      title: t.explore.settings,
      items: [
        {
          title: t.explore.language,
          subtitle: LANGUAGES.find(l => l.code === language)?.name || 'English',
          icon: "globe",
          action: handleLanguageSelect,
        },
        {
          title: t.explore.notifications,
          subtitle: t.explore.notificationSettings,
          icon: "bell.fill",
          action: handleNotificationSettings,
        },
      ],
    },
    {
      title: t.explore.mosqueInformation,
      items: [
        {
          title: t.explore.locationDirections,
          subtitle: t.explore.locationSubtitle,
          icon: "location.fill",
          action: handleOpenMaps,
        },
        {
          title: t.explore.contactUs,
          subtitle: t.explore.contactSubtitle,
          icon: "phone.fill",
          action: handleCall,
        },
        {
          title: t.explore.visitWebsite,
          subtitle: t.explore.websiteSubtitle,
          icon: "globe",
          action: handleWebsite,
        },
      ],
    },
    {
      title: t.explore.community,
      items: [
        {
          title: t.explore.supportMosque,
          subtitle: t.explore.donationComingSoon,
          icon: "heart.fill",
          action: handleDonate,
        },
        {
          title: t.explore.sendFeedback,
          subtitle: t.explore.feedbackSubtitle,
          icon: "envelope.fill",
          action: handleFeedback,
        },
      ],
    },
    {
      title: t.explore.about,
      items: [
        {
          title: t.explore.about,
          subtitle: `${t.explore.version} 1.1.5`,
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
              {t.explore.title}
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: colors.text + "80" }]}
            >
              {t.explore.subtitle}
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
              {t.explore.mosqueName}
            </Text>
            <Text style={[styles.mosqueAddress, { color: colors.text + "60" }]}>
              {t.explore.mosqueAddress}
            </Text>

            <View style={styles.mosqueStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.tint }]}>
                  5
                </Text>
                <Text style={[styles.statLabel, { color: colors.text + "60" }]}>
                  {t.explore.dailyPrayers}
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
                  {t.explore.daysOpen}
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
                  {t.explore.blessings}
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

      {/* Language Selection Modal */}
      {showLanguageMenu && (
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowLanguageMenu(false)}
          activeOpacity={1}
        >
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.languageModal,
                {
                  backgroundColor: colors.background,
                  shadowColor: colorScheme === "dark" ? "#000" : "#000",
                },
              ]}
            >
              <View style={styles.languageModalHeader}>
                <Text style={[styles.languageModalTitle, { color: colors.text }]}>
                  {t.explore.changeLanguage}
                </Text>
              </View>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    language === lang.code && styles.languageOptionActive,
                  ]}
                  onPress={() => handleLanguageChange(lang.code as Language)}
                  activeOpacity={0.7}
                >
                  <View style={styles.languageOptionContent}>
                    <Text style={[styles.languageOptionName, { color: colors.text }]}>
                      {lang.name}
                    </Text>
                    <Text style={[styles.languageOptionNative, { color: colors.text + "80" }]}>
                      {lang.nativeName}
                    </Text>
                  </View>
                  {language === lang.code && (
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={24}
                      color={colors.tint}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      )}
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

  // Language Modal
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },

  languageModal: {
    width: "90%",
    maxWidth: 320,
    borderRadius: 18,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },

  languageModalHeader: {
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },

  languageModalTitle: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.4,
    textAlign: "center",
  },

  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },

  languageOptionActive: {
    backgroundColor: "rgba(0,122,255,0.08)",
  },

  languageOptionContent: {
    flex: 1,
  },

  languageOptionName: {
    fontSize: 17,
    fontWeight: "400",
    letterSpacing: -0.4,
    marginBottom: 2,
  },

  languageOptionNative: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
});

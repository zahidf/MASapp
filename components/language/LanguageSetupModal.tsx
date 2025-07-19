import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language, LANGUAGES } from '@/types/language';

interface LanguageSetupModalProps {
  visible: boolean;
  onComplete: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function LanguageSetupModal({ visible, onComplete }: LanguageSetupModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { language: currentLanguage, changeLanguage, completeLanguageSetup, t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = React.useState<Language>(currentLanguage);
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      
      // Animate modal entrance
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations when modal closes
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleContinue = async () => {
    try {
      await changeLanguage(selectedLanguage);
      await completeLanguageSetup();
      onComplete();
    } catch (error) {
      console.error('Error setting language:', error);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      statusBarTranslucent={true}
      presentationStyle="overFullScreen"
    >
      <TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  backgroundColor: colors.background,
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [100, 0],
                      }),
                    },
                    {
                      scale: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* iOS-style handle */}
              <View style={styles.handleContainer}>
                <View
                  style={[styles.handle, { backgroundColor: colors.text + '30' }]}
                />
              </View>

              {/* Content */}
              <View style={styles.contentContainer}>
                <Animated.View
                  style={[
                    styles.content,
                    {
                      opacity: fadeAnim,
                      transform: [
                        {
                          scale: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.9, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {/* Hero Icon */}
                  <View style={styles.heroContainer}>
                    <View
                      style={[
                        styles.iconContainer,
                        {
                          backgroundColor: colors.primary + '15',
                          borderColor: colors.primary + '30',
                        },
                      ]}
                    >
                      <IconSymbol name="globe" size={48} color={colors.primary} />
                    </View>
                  </View>

                  {/* Title and Description */}
                  <View style={styles.textContent}>
                    <Text style={[styles.title, { color: colors.text }]}>
                      {t.languageSetup.title}
                    </Text>
                    <Text style={[styles.description, { color: colors.text + 'B3' }]}>
                      {t.languageSetup.description}
                    </Text>
                  </View>

                  {/* Language Options */}
                  <View style={styles.languageOptions}>
                    {LANGUAGES.map((lang) => (
                      <TouchableOpacity
                        key={lang.code}
                        style={[
                          styles.languageOption,
                          {
                            backgroundColor: colors.surface + '95',
                            borderColor:
                              selectedLanguage === lang.code
                                ? colors.primary
                                : colorScheme === 'dark'
                                ? 'rgba(255,255,255,0.06)'
                                : 'rgba(0,0,0,0.04)',
                            borderWidth: selectedLanguage === lang.code ? 2 : 1,
                          },
                        ]}
                        onPress={() => setSelectedLanguage(lang.code as Language)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.languageContent}>
                          <Text style={[styles.languageName, { color: colors.text }]}>
                            {lang.name}
                          </Text>
                          <Text style={[styles.languageNativeName, { color: colors.text + '80' }]}>
                            {lang.nativeName}
                          </Text>
                        </View>
                        {selectedLanguage === lang.code && (
                          <IconSymbol
                            name="checkmark.circle.fill"
                            size={24}
                            color={colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </Animated.View>
              </View>

              {/* Button Bar */}
              <View
                style={[
                  styles.buttonBar,
                  {
                    borderTopColor: colors.text + '10',
                    backgroundColor: colors.background,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.primaryButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleContinue}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>
                    {t.languageSetup.continue}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },

  handleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },

  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },

  contentContainer: {
    padding: 20,
  },

  content: {
    alignItems: 'center',
  },

  heroContainer: {
    marginTop: 8,
    marginBottom: 24,
  },

  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  textContent: {
    alignItems: 'center',
    marginBottom: 32,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.37,
    textAlign: 'center',
    marginBottom: 8,
  },

  description: {
    fontSize: 17,
    letterSpacing: -0.4,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },

  languageOptions: {
    width: '100%',
    gap: 12,
  },

  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
  },

  languageContent: {
    flex: 1,
  },

  languageName: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
    marginBottom: 2,
  },

  languageNativeName: {
    fontSize: 15,
    letterSpacing: -0.2,
  },

  buttonBar: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  button: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },

  primaryButton: {
    width: '100%',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
});
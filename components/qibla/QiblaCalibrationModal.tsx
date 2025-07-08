import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface QiblaCalibrationModalProps {
  showCalibrationModal: boolean;
  setShowCalibrationModal: (show: boolean) => void;
  colors: {
    background: string;
    text: string;
    tint: string;
  };
  colorScheme: 'light' | 'dark' | null | undefined;
}

export const QiblaCalibrationModal: React.FC<QiblaCalibrationModalProps> = ({
  showCalibrationModal,
  setShowCalibrationModal,
  colors,
  colorScheme,
}) => {
  // Modal animation values
  const modalSlideAnim = useRef(new Animated.Value(0)).current;
  const modalFadeAnim = useRef(new Animated.Value(0)).current;

  // Handle modal visibility animations
  useEffect(() => {
    // CalibrationModal visibility changed
    if (showCalibrationModal) {
      // Reset animations
      modalSlideAnim.setValue(0);
      modalFadeAnim.setValue(0);
      
      // Animate modal entrance
      Animated.parallel([
        Animated.spring(modalSlideAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(modalFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Modal animation completed
      });
    } else {
      // Reset animations when modal closes
      modalSlideAnim.setValue(0);
      modalFadeAnim.setValue(0);
    }
  }, [showCalibrationModal, modalSlideAnim, modalFadeAnim]);

  // CalibrationModal component rendering
  
  return (
    <Modal
      visible={showCalibrationModal}
      animationType="none" // We'll handle animation ourselves
      transparent={true}
      statusBarTranslucent={true}
      presentationStyle="overFullScreen"
      onRequestClose={() => setShowCalibrationModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalTouchableOverlay} 
        activeOpacity={1} 
        onPress={() => setShowCalibrationModal(false)}
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: modalFadeAnim,
            },
          ]}
        >
          <TouchableOpacity activeOpacity={1}>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  backgroundColor: colors.background,
                  transform: [
                    {
                      translateY: modalSlideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [100, 0],
                      }),
                    },
                    {
                      scale: modalSlideAnim.interpolate({
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
                  style={[styles.handle, { backgroundColor: colors.text + "30" }]}
                />
              </View>
              
              {/* Content */}
              <View style={styles.modalContent}>
                <View style={[
                  styles.modalIconContainer,
                  { backgroundColor: colors.tint + "15" }
                ]}>
                  <IconSymbol name="location.fill" size={48} color={colors.tint} />
                </View>
                
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Calibrate Your Compass
                </Text>
                
                <Text style={[styles.modalText, { color: colors.text + "80" }]}>
                  For accurate Qibla direction:
                </Text>
                
                <View style={styles.modalInstructions}>
                  <View style={styles.instructionItem}>
                    <View style={[styles.instructionNumber, { backgroundColor: colors.tint + "20" }]}>
                      <Text style={[styles.instructionNumberText, { color: colors.tint }]}>1</Text>
                    </View>
                    <Text style={[styles.instructionText, { color: colors.text }]}>
                      Place your phone on a flat surface
                    </Text>
                  </View>
                  
                  <View style={styles.instructionItem}>
                    <View style={[styles.instructionNumber, { backgroundColor: colors.tint + "20" }]}>
                      <Text style={[styles.instructionNumberText, { color: colors.tint }]}>2</Text>
                    </View>
                    <Text style={[styles.instructionText, { color: colors.text }]}>
                      Move your phone in a figure-8 pattern to calibrate
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={[styles.calibrateButton, { backgroundColor: colors.tint }]}
                  onPress={() => setShowCalibrationModal(false)}
                >
                  <Text style={styles.calibrateButtonText}>Got it</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Modal styles
  modalTouchableOverlay: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  modalContent: {
    padding: 24,
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.38,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.2,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  modalInstructions: {
    marginBottom: 24,
    paddingHorizontal: 20,
    width: '100%',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  instructionNumberText: {
    fontSize: 16,
    fontWeight: '600',
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.2,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  calibrateButton: {
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calibrateButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
});
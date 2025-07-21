import { NotificationSetupModal } from '@/components/notifications/NotificationSetupModal';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { useSetupFlow } from '@/contexts/SetupFlowContext';
import React from 'react';
import { LanguageSetupModal } from './language/LanguageSetupModal';

export function SetupFlowModals() {
  const {
    isInSetupFlow,
    showLanguageModal,
    showNotificationModal,
    handleLanguageComplete,
    handleNotificationComplete,
    handleNotificationSkip,
  } = useSetupFlow();
  
  const { updatePreferences, dismissSetup } = useNotificationContext();

  if (!isInSetupFlow) {
    return null;
  }

  // Override the language modal complete to not actually complete setup
  const handleLanguageCompleteTest = () => {
    // Just trigger the transition without completing actual setup
    handleLanguageComplete();
  };

  const handleNotificationCompleteWithPrefs = async (preferences: any) => {
    // In test mode, don't actually save preferences
    handleNotificationComplete();
  };

  const handleNotificationSkipWithDismiss = async () => {
    // In test mode, don't actually dismiss
    handleNotificationSkip();
  };

  return (
    <>
      <LanguageSetupModal
        visible={showLanguageModal}
        onComplete={handleLanguageCompleteTest}
      />
      
      <NotificationSetupModal
        visible={showNotificationModal}
        onComplete={handleNotificationCompleteWithPrefs}
        onSkip={handleNotificationSkipWithDismiss}
      />
    </>
  );
}
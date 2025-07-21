import React, { createContext, ReactNode, useContext, useState, useCallback } from 'react';

interface SetupFlowContextType {
  startSetupFlow: () => void;
  isInSetupFlow: boolean;
  showLanguageModal: boolean;
  showNotificationModal: boolean;
  handleLanguageComplete: () => void;
  handleNotificationComplete: () => void;
  handleNotificationSkip: () => void;
}

const SetupFlowContext = createContext<SetupFlowContextType | undefined>(undefined);

export function SetupFlowProvider({ children }: { children: ReactNode }) {
  
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isInSetupFlow, setIsInSetupFlow] = useState(false);

  const startSetupFlow = () => {
    console.log('Starting setup flow');
    setIsInSetupFlow(true);
    setShowLanguageModal(true);
  };

  const handleLanguageComplete = useCallback(() => {
    console.log('Language complete, transitioning to notification');
    // Close language modal first
    setShowLanguageModal(false);
    
    // Then show notification modal after a small delay
    setTimeout(() => {
      console.log('Showing notification modal');
      setShowNotificationModal(true);
    }, 300); // Wait for language modal animation to complete
  }, []);

  const handleNotificationComplete = useCallback(() => {
    console.log('Notification complete');
    setShowNotificationModal(false);
    setIsInSetupFlow(false);
  }, []);

  const handleNotificationSkip = useCallback(() => {
    console.log('Notification skipped');
    setShowNotificationModal(false);
    setIsInSetupFlow(false);
  }, []);

  const value = {
    startSetupFlow,
    isInSetupFlow,
    showLanguageModal,
    showNotificationModal,
    handleLanguageComplete,
    handleNotificationComplete,
    handleNotificationSkip,
  };

  return (
    <SetupFlowContext.Provider value={value}>
      {children}
    </SetupFlowContext.Provider>
  );
}

export const useSetupFlow = () => {
  const context = useContext(SetupFlowContext);
  if (!context) {
    throw new Error('useSetupFlow must be used within SetupFlowProvider');
  }
  return context;
};
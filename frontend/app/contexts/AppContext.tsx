import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  priority: number;
}

export interface Alert {
  id: string;
  timestamp: Date;
  detectionType: 'voice' | 'gesture' | 'behavioral' | 'manual';
  confidence: number;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  timeline: AlertTimelineEvent[];
  resolved: boolean;
}

export interface AlertTimelineEvent {
  id: string;
  type: string;
  label: string;
  detail: string;
  timestamp: Date;
}

export interface DetectionState {
  voiceConfidence: number;
  gestureConfidence: number;
  behavioralConfidence: number;
  fusionScore: number;
  gestureState: 'waiting' | 'palm_detected' | 'fist' | 'waving' | 'covered';
  micLevel: number;
}

interface AppState {
  // User data
  userName: string;
  emergencyContacts: EmergencyContact[];
  isOnboarded: boolean;
  
  // Protection settings
  protectionActive: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  silentMode: boolean;
  
  // Detection modules
  voiceDetectionEnabled: boolean;
  gestureDetectionEnabled: boolean;
  behavioralDetectionEnabled: boolean;
  
  // Alert state
  alertState: 'idle' | 'detecting' | 'alert';
  currentAlert: Alert | null;
  detectionState: DetectionState;
  
  // Actions
  setUserName: (name: string) => void;
  setEmergencyContacts: (contacts: EmergencyContact[]) => void;
  setOnboarded: (value: boolean) => void;
  toggleProtection: () => void;
  setSensitivity: (level: 'low' | 'medium' | 'high') => void;
  toggleSilentMode: () => void;
  toggleVoiceDetection: () => void;
  toggleGestureDetection: () => void;
  toggleBehavioralDetection: () => void;
  triggerAlert: (type: 'voice' | 'gesture' | 'behavioral' | 'manual', confidence: number) => void;
  cancelAlert: () => void;
  resolveAlert: () => void;
  updateDetectionState: (state: Partial<DetectionState>) => void;
  resetApp: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userName, setUserNameState] = useState('');
  const [emergencyContacts, setEmergencyContactsState] = useState<EmergencyContact[]>([]);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [protectionActive, setProtectionActive] = useState(false);
  const [sensitivity, setSensitivityState] = useState<'low' | 'medium' | 'high'>('medium');
  const [silentMode, setSilentMode] = useState(true);
  const [voiceDetectionEnabled, setVoiceDetectionEnabled] = useState(true);
  const [gestureDetectionEnabled, setGestureDetectionEnabled] = useState(true);
  const [behavioralDetectionEnabled, setBehavioralDetectionEnabled] = useState(true);
  const [alertState, setAlertState] = useState<'idle' | 'detecting' | 'alert'>('idle');
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);
  const [detectionState, setDetectionState] = useState<DetectionState>({
    voiceConfidence: 0,
    gestureConfidence: 0,
    behavioralConfidence: 0,
    fusionScore: 0,
    gestureState: 'waiting',
    micLevel: 0,
  });

  // Load saved data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const saved = await AsyncStorage.getItem('rakshak_data');
      if (saved) {
        const data = JSON.parse(saved);
        setUserNameState(data.userName || '');
        setEmergencyContactsState(data.emergencyContacts || []);
        setIsOnboarded(data.isOnboarded || false);
        setSensitivityState(data.sensitivity || 'medium');
        setSilentMode(data.silentMode !== undefined ? data.silentMode : true);
        setVoiceDetectionEnabled(data.voiceDetectionEnabled !== undefined ? data.voiceDetectionEnabled : true);
        setGestureDetectionEnabled(data.gestureDetectionEnabled !== undefined ? data.gestureDetectionEnabled : true);
        setBehavioralDetectionEnabled(data.behavioralDetectionEnabled !== undefined ? data.behavioralDetectionEnabled : true);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const saveData = async (data: any) => {
    try {
      await AsyncStorage.setItem('rakshak_data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  const setUserName = (name: string) => {
    setUserNameState(name);
    saveData({ userName: name, emergencyContacts, isOnboarded, sensitivity, silentMode, voiceDetectionEnabled, gestureDetectionEnabled, behavioralDetectionEnabled });
  };

  const setEmergencyContacts = (contacts: EmergencyContact[]) => {
    setEmergencyContactsState(contacts);
    saveData({ userName, emergencyContacts: contacts, isOnboarded, sensitivity, silentMode, voiceDetectionEnabled, gestureDetectionEnabled, behavioralDetectionEnabled });
  };

  const setOnboarded = (value: boolean) => {
    setIsOnboarded(value);
    saveData({ userName, emergencyContacts, isOnboarded: value, sensitivity, silentMode, voiceDetectionEnabled, gestureDetectionEnabled, behavioralDetectionEnabled });
  };

  const toggleProtection = () => {
    setProtectionActive(!protectionActive);
  };

  const setSensitivity = (level: 'low' | 'medium' | 'high') => {
    setSensitivityState(level);
    saveData({ userName, emergencyContacts, isOnboarded, sensitivity: level, silentMode, voiceDetectionEnabled, gestureDetectionEnabled, behavioralDetectionEnabled });
  };

  const toggleSilentMode = () => {
    const newValue = !silentMode;
    setSilentMode(newValue);
    saveData({ userName, emergencyContacts, isOnboarded, sensitivity, silentMode: newValue, voiceDetectionEnabled, gestureDetectionEnabled, behavioralDetectionEnabled });
  };

  const toggleVoiceDetection = () => {
    const newValue = !voiceDetectionEnabled;
    setVoiceDetectionEnabled(newValue);
    saveData({ userName, emergencyContacts, isOnboarded, sensitivity, silentMode, voiceDetectionEnabled: newValue, gestureDetectionEnabled, behavioralDetectionEnabled });
  };

  const toggleGestureDetection = () => {
    const newValue = !gestureDetectionEnabled;
    setGestureDetectionEnabled(newValue);
    saveData({ userName, emergencyContacts, isOnboarded, sensitivity, silentMode, voiceDetectionEnabled, gestureDetectionEnabled: newValue, behavioralDetectionEnabled });
  };

  const toggleBehavioralDetection = () => {
    const newValue = !behavioralDetectionEnabled;
    setBehavioralDetectionEnabled(newValue);
    saveData({ userName, emergencyContacts, isOnboarded, sensitivity, silentMode, voiceDetectionEnabled, gestureDetectionEnabled, behavioralDetectionEnabled: newValue });
  };

  const triggerAlert = (type: 'voice' | 'gesture' | 'behavioral' | 'manual', confidence: number) => {
    const timeline: AlertTimelineEvent[] = [
      { id: '1', type: 'trigger', label: 'Alert triggered', detail: 'Distress detected by AI', timestamp: new Date() },
      { id: '2', type: 'haptic', label: 'Haptic SOS sent', detail: `Only ${userName || 'you'} felt ··· ——— ···`, timestamp: new Date() },
      { id: '3', type: 'sms', label: 'SMS sent to 3 contacts', detail: emergencyContacts.map(c => c.name).join(', ') + ' notified', timestamp: new Date() },
      { id: '4', type: 'location', label: 'Location captured', detail: 'Koramangala, Bangalore', timestamp: new Date() },
      { id: '5', type: 'recording', label: 'Recording started', detail: 'Audio evidence in progress', timestamp: new Date() },
      { id: '6', type: 'tracking', label: 'Live tracking active', detail: 'GPS updating every 10s', timestamp: new Date() },
    ];

    const alert: Alert = {
      id: Date.now().toString(),
      timestamp: new Date(),
      detectionType: type,
      confidence,
      location: {
        latitude: 12.9716,
        longitude: 77.5946,
        address: 'Koramangala, Bangalore',
      },
      timeline,
      resolved: false,
    };

    setCurrentAlert(alert);
    setAlertState('alert');
  };

  const cancelAlert = () => {
    setAlertState('idle');
    setCurrentAlert(null);
  };

  const resolveAlert = () => {
    if (currentAlert) {
      setCurrentAlert({ ...currentAlert, resolved: true });
    }
    setAlertState('idle');
  };

  const updateDetectionState = (state: Partial<DetectionState>) => {
    setDetectionState((prev) => ({ ...prev, ...state }));
  };

  const resetApp = async () => {
    await AsyncStorage.removeItem('rakshak_data');
    setUserNameState('');
    setEmergencyContactsState([]);
    setIsOnboarded(false);
    setSensitivityState('medium');
    setSilentMode(true);
    setVoiceDetectionEnabled(true);
    setGestureDetectionEnabled(true);
    setBehavioralDetectionEnabled(true);
    setProtectionActive(false);
    setAlertState('idle');
    setCurrentAlert(null);
  };

  return (
    <AppContext.Provider
      value={{
        userName,
        emergencyContacts,
        isOnboarded,
        protectionActive,
        sensitivity,
        silentMode,
        voiceDetectionEnabled,
        gestureDetectionEnabled,
        behavioralDetectionEnabled,
        alertState,
        currentAlert,
        detectionState,
        setUserName,
        setEmergencyContacts,
        setOnboarded,
        toggleProtection,
        setSensitivity,
        toggleSilentMode,
        toggleVoiceDetection,
        toggleGestureDetection,
        toggleBehavioralDetection,
        triggerAlert,
        cancelAlert,
        resolveAlert,
        updateDetectionState,
        resetApp,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

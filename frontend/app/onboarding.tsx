import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp, EmergencyContact } from './contexts/AppContext';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { id: '1', name: '', phone: '', relation: 'Mother', priority: 1 },
    { id: '2', name: '', phone: '', relation: 'Friend', priority: 2 },
    { id: '3', name: '', phone: '', relation: 'Brother', priority: 3 },
  ]);
  const [permissionsGranted, setPermissionsGranted] = useState({
    camera: false,
    microphone: false,
    location: false,
    sms: false,
  });

  const { setUserName, setEmergencyContacts, setOnboarded } = useApp();
  const router = useRouter();

  const updateContact = (index: number, field: 'name' | 'phone', value: string) => {
    const newContacts = [...contacts];
    newContacts[index][field] = value;
    setContacts(newContacts);
  };

  const requestPermissions = async () => {
    try {
      // Request camera
      const cameraResult = await Camera.requestCameraPermissionsAsync();
      // Request microphone
      const audioResult = await Audio.requestPermissionsAsync();
      // Request location
      const locationResult = await Location.requestForegroundPermissionsAsync();
      // Check SMS availability
      const smsAvailable = await SMS.isAvailableAsync();

      setPermissionsGranted({
        camera: cameraResult.status === 'granted',
        microphone: audioResult.status === 'granted',
        location: locationResult.status === 'granted',
        sms: smsAvailable,
      });

      if (
        cameraResult.status === 'granted' &&
        audioResult.status === 'granted' &&
        locationResult.status === 'granted'
      ) {
        setStep(5);
      } else {
        Alert.alert('Permissions Required', 'Please grant all permissions for RAKSHAK to protect you.');
      }
    } catch (error) {
      console.error('Permission error:', error);
      Alert.alert('Error', 'Failed to request permissions. Please try again.');
    }
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!name.trim()) {
        Alert.alert('Name Required', 'Please enter your name to continue.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      const allFilled = contacts.every((c) => c.name.trim() && c.phone.trim());
      if (!allFilled) {
        Alert.alert('Contacts Required', 'Please fill all 3 emergency contacts.');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      requestPermissions();
    } else if (step === 5) {
      setStep(6);
    } else if (step === 6) {
      // Save data and complete onboarding
      setUserName(name);
      setEmergencyContacts(contacts);
      setOnboarded(true);
      router.replace('/(tabs)');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={120} color="#10B981" />
            </View>
            <Text style={styles.title}>RAKSHAK</Text>
            <Text style={styles.subtitle}>Your Silent Guardian</Text>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="mic" size={24} color="#10B981" />
                <Text style={styles.featureText}>Detects distress from your voice</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="hand-left" size={24} color="#8B5CF6" />
                <Text style={styles.featureText}>Watches for emergency hand gestures</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="volume-mute" size={24} color="#3B82F6" />
                <Text style={styles.featureText}>Alerts contacts silently (attacker never knows)</Text>
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.heading}>What should we call you?</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#64748B"
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>
        );

      case 3:
        return (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView style={styles.stepContainer}>
              <Text style={styles.heading}>Who should we alert?</Text>
              <Text style={styles.description}>
                These people will receive your location if you're in danger
              </Text>
              {contacts.map((contact, index) => (
                <View key={contact.id} style={styles.contactCard}>
                  <Text style={styles.contactLabel}>
                    Contact {index + 1} {index === 0 && '(Most Important)'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Name"
                    placeholderTextColor="#64748B"
                    value={contact.name}
                    onChangeText={(value) => updateContact(index, 'name', value)}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    placeholderTextColor="#64748B"
                    value={contact.phone}
                    onChangeText={(value) => updateContact(index, 'phone', value)}
                    keyboardType="phone-pad"
                  />
                </View>
              ))}
            </ScrollView>
          </KeyboardAvoidingView>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.heading}>RAKSHAK needs these to protect you</Text>
            <View style={styles.permissionList}>
              <View style={styles.permissionItem}>
                <Ionicons name="mic" size={32} color="#10B981" />
                <View style={styles.permissionText}>
                  <Text style={styles.permissionTitle}>Microphone</Text>
                  <Text style={styles.permissionDescription}>To detect distress keywords and screams</Text>
                </View>
                {permissionsGranted.microphone && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
              </View>
              <View style={styles.permissionItem}>
                <Ionicons name="camera" size={32} color="#8B5CF6" />
                <View style={styles.permissionText}>
                  <Text style={styles.permissionTitle}>Camera</Text>
                  <Text style={styles.permissionDescription}>To detect emergency hand gestures</Text>
                </View>
                {permissionsGranted.camera && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
              </View>
              <View style={styles.permissionItem}>
                <Ionicons name="location" size={32} color="#3B82F6" />
                <View style={styles.permissionText}>
                  <Text style={styles.permissionTitle}>Location</Text>
                  <Text style={styles.permissionDescription}>To share your location in emergencies</Text>
                </View>
                {permissionsGranted.location && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
              </View>
              <View style={styles.permissionItem}>
                <Ionicons name="chatbubbles" size={32} color="#F59E0B" />
                <View style={styles.permissionText}>
                  <Text style={styles.permissionTitle}>SMS</Text>
                  <Text style={styles.permissionDescription}>To alert your emergency contacts</Text>
                </View>
                {permissionsGranted.sms && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
              </View>
            </View>
          </View>
        );

      case 5:
        return (
          <ScrollView style={styles.stepContainer}>
            <Text style={styles.heading}>Learn your emergency gestures</Text>
            <View style={styles.gestureCard}>
              <Text style={styles.gestureTitle}>Help Gesture</Text>
              <Text style={styles.gestureVisual}>✋ → ✊</Text>
              <Text style={styles.gestureDescription}>Open palm to camera, then close into fist</Text>
              <Text style={styles.gestureNote}>Works within 2 seconds</Text>
            </View>
            <View style={styles.gestureCard}>
              <Text style={styles.gestureTitle}>Wave Gesture</Text>
              <Text style={styles.gestureVisual}>👋</Text>
              <Text style={styles.gestureDescription}>Wave hand rapidly left and right</Text>
              <Text style={styles.gestureNote}>4+ times in 1 second</Text>
            </View>
            <View style={styles.gestureCard}>
              <Text style={styles.gestureTitle}>Camera Cover</Text>
              <Text style={styles.gestureVisual}>🤚</Text>
              <Text style={styles.gestureDescription}>Cover camera lens with palm</Text>
              <Text style={styles.gestureNote}>Hold for 2 seconds</Text>
            </View>
          </ScrollView>
        );

      case 6:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={120} color="#10B981" />
            </View>
            <Text style={styles.readyTitle}>You're Protected</Text>
            <View style={styles.checklistContainer}>
              <View style={styles.checklistItem}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text style={styles.checklistText}>{name} saved</Text>
              </View>
              <View style={styles.checklistItem}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text style={styles.checklistText}>3 emergency contacts ready</Text>
              </View>
              <View style={styles.checklistItem}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text style={styles.checklistText}>All permissions granted</Text>
              </View>
              <View style={styles.checklistItem}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text style={styles.checklistText}>Gestures learned</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <View key={s} style={[styles.progressDot, s <= step && styles.progressDotActive]} />
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>{renderStep()}</View>

      {/* Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {step === 1 && 'Get Started'}
            {step === 2 && 'Continue'}
            {step === 3 && 'Continue'}
            {step === 4 && 'Grant All Permissions'}
            {step === 5 && "Got it, protect me!"}
            {step === 6 && 'Start RAKSHAK'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingTop: 60,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#334155',
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: '#10B981',
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContainer: {
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 40,
  },
  featureList: {
    marginTop: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  featureText: {
    fontSize: 16,
    color: '#F1F5F9',
    marginLeft: 16,
    flex: 1,
  },
  heading: {
    fontSize: 28,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 16,
    marginTop: 16,
  },
  description: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  contactCard: {
    marginBottom: 24,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  permissionList: {
    marginTop: 24,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  permissionText: {
    flex: 1,
    marginLeft: 16,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 13,
    color: '#94A3B8',
  },
  gestureCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  gestureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 16,
  },
  gestureVisual: {
    fontSize: 48,
    marginBottom: 16,
  },
  gestureDescription: {
    fontSize: 15,
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 8,
  },
  gestureNote: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  readyTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 40,
  },
  checklistContainer: {
    marginTop: 24,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checklistText: {
    fontSize: 16,
    color: '#F1F5F9',
    marginLeft: 12,
  },
  buttonContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

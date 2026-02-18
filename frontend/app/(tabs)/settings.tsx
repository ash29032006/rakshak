import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useApp, EmergencyContact } from '../contexts/AppContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function Settings() {
  const {
    userName,
    emergencyContacts,
    sensitivity,
    silentMode,
    voiceDetectionEnabled,
    gestureDetectionEnabled,
    behavioralDetectionEnabled,
    setUserName,
    setEmergencyContacts,
    setSensitivity,
    toggleSilentMode,
    toggleVoiceDetection,
    toggleGestureDetection,
    toggleBehavioralDetection,
    triggerAlert,
    resetApp,
  } = useApp();

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [tempContact, setTempContact] = useState<EmergencyContact | null>(null);

  const handleSaveName = () => {
    if (tempName.trim()) {
      setUserName(tempName.trim());
      setEditingName(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert('Error', 'Name cannot be empty');
    }
  };

  const handleEditContact = (contact: EmergencyContact) => {
    setEditingContact(contact.id);
    setTempContact({ ...contact });
  };

  const handleSaveContact = () => {
    if (tempContact && tempContact.name.trim() && tempContact.phone.trim()) {
      const updatedContacts = emergencyContacts.map((c) => (c.id === tempContact.id ? tempContact : c));
      setEmergencyContacts(updatedContacts);
      setEditingContact(null);
      setTempContact(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert('Error', 'Please fill all contact fields');
    }
  };

  const handleTestAlert = () => {
    Alert.alert(
      'Test Alert',
      'This will trigger a test alert. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Test',
          onPress: () => {
            triggerAlert('manual', 0.95);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Everything',
      'This will clear all data and reset RAKSHAK to initial state. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetApp();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>

          {/* User Profile */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>User Profile</Text>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
              </View>
              {editingName ? (
                <View style={styles.nameEditContainer}>
                  <TextInput
                    style={styles.nameInput}
                    value={tempName}
                    onChangeText={setTempName}
                    placeholder="Enter your name"
                    placeholderTextColor="#64748B"
                    autoFocus
                  />
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveName}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.nameDisplayContainer}>
                  <Text style={styles.userName}>{userName}</Text>
                  <TouchableOpacity onPress={() => setEditingName(true)}>
                    <Ionicons name="pencil" size={20} color="#3B82F6" />
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.userSubtitle}>RAKSHAK User</Text>
            </View>
          </View>

          {/* Emergency Contacts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            <Text style={styles.sectionDescription}>These contacts receive SMS alerts in emergencies</Text>
            {emergencyContacts.map((contact, index) => (
              <View key={contact.id} style={styles.contactCard}>
                {editingContact === contact.id ? (
                  <>
                    <TextInput
                      style={styles.contactInput}
                      value={tempContact?.name}
                      onChangeText={(text) => setTempContact({ ...tempContact!, name: text })}
                      placeholder="Name"
                      placeholderTextColor="#64748B"
                    />
                    <TextInput
                      style={styles.contactInput}
                      value={tempContact?.phone}
                      onChangeText={(text) => setTempContact({ ...tempContact!, phone: text })}
                      placeholder="Phone"
                      placeholderTextColor="#64748B"
                      keyboardType="phone-pad"
                    />
                    <TouchableOpacity style={styles.saveContactButton} onPress={handleSaveContact}>
                      <Text style={styles.saveContactButtonText}>Save</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.contactHeader}>
                      <View style={styles.contactAvatar}>
                        <Text style={styles.contactAvatarText}>{contact.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        <Text style={styles.contactPhone}>{contact.phone}</Text>
                      </View>
                      <View style={styles.contactBadge}>
                        <Text style={styles.contactBadgeText}>Priority {contact.priority}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleEditContact(contact)}>
                        <Ionicons name="pencil" size={20} color="#3B82F6" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ))}
          </View>

          {/* Protection Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Protection Settings</Text>

            {/* Sensitivity */}
            <View style={styles.settingCard}>
              <Text style={styles.settingLabel}>Sensitivity</Text>
              <Text style={styles.settingDescription}>
                {sensitivity === 'low' && 'LOW: 85% confidence required (fewer false alerts)'}
                {sensitivity === 'medium' && 'MEDIUM: 75% confidence (recommended)'}
                {sensitivity === 'high' && 'HIGH: 65% confidence (more sensitive)'}
              </Text>
              <View style={styles.sensitivityButtons}>
                <TouchableOpacity
                  style={[styles.sensitivityButton, sensitivity === 'low' && styles.sensitivityButtonActive]}
                  onPress={() => {
                    setSensitivity('low');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text
                    style={[styles.sensitivityButtonText, sensitivity === 'low' && styles.sensitivityButtonTextActive]}
                  >
                    LOW
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sensitivityButton, sensitivity === 'medium' && styles.sensitivityButtonActive]}
                  onPress={() => {
                    setSensitivity('medium');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text
                    style={[
                      styles.sensitivityButtonText,
                      sensitivity === 'medium' && styles.sensitivityButtonTextActive,
                    ]}
                  >
                    MEDIUM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sensitivityButton, sensitivity === 'high' && styles.sensitivityButtonActive]}
                  onPress={() => {
                    setSensitivity('high');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text
                    style={[styles.sensitivityButtonText, sensitivity === 'high' && styles.sensitivityButtonTextActive]}
                  >
                    HIGH
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Silent Mode */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Silent Mode</Text>
                <Text style={styles.settingDescription}>Zero visible indication when alert triggers</Text>
                <Text style={styles.settingRecommended}>Recommended: ON</Text>
              </View>
              <Switch
                value={silentMode}
                onValueChange={() => {
                  toggleSilentMode();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                trackColor={{ false: '#334155', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Detection Modules */}
            <Text style={styles.subsectionTitle}>Detection Modules</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingLabelRow}>
                  <Ionicons name="mic" size={20} color="#10B981" />
                  <Text style={styles.settingLabel}>Voice Detection</Text>
                </View>
                <Text style={styles.settingDescription}>Keywords + screams</Text>
              </View>
              <Switch
                value={voiceDetectionEnabled}
                onValueChange={() => {
                  toggleVoiceDetection();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                trackColor={{ false: '#334155', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingLabelRow}>
                  <Ionicons name="hand-left" size={20} color="#8B5CF6" />
                  <Text style={styles.settingLabel}>Gesture Detection</Text>
                </View>
                <Text style={styles.settingDescription}>Camera-based hand gestures</Text>
              </View>
              <Switch
                value={gestureDetectionEnabled}
                onValueChange={() => {
                  toggleGestureDetection();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                trackColor={{ false: '#334155', true: '#8B5CF6' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingLabelRow}>
                  <Ionicons name="cellular" size={20} color="#3B82F6" />
                  <Text style={styles.settingLabel}>Behavioral Detection</Text>
                </View>
                <Text style={styles.settingDescription}>Accelerometer patterns</Text>
              </View>
              <Switch
                value={behavioralDetectionEnabled}
                onValueChange={() => {
                  toggleBehavioralDetection();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                trackColor={{ false: '#334155', true: '#3B82F6' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Gesture Reference */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gesture Reference</Text>
            <View style={styles.gestureCard}>
              <Text style={styles.gestureTitle}>Help Gesture</Text>
              <Text style={styles.gestureVisual}>✋ → ✊</Text>
              <Text style={styles.gestureDescription}>Open palm to camera, then close into fist</Text>
              <Text style={styles.gestureNote}>Works within 2 seconds</Text>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceBadgeText}>95% confidence</Text>
              </View>
            </View>

            <View style={styles.gestureCard}>
              <Text style={styles.gestureTitle}>Rapid Wave</Text>
              <Text style={styles.gestureVisual}>👋</Text>
              <Text style={styles.gestureDescription}>Wave hand rapidly left and right</Text>
              <Text style={styles.gestureNote}>4+ times in 1 second</Text>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceBadgeText}>85% confidence</Text>
              </View>
            </View>

            <View style={styles.gestureCard}>
              <Text style={styles.gestureTitle}>Camera Cover</Text>
              <Text style={styles.gestureVisual}>🤚</Text>
              <Text style={styles.gestureDescription}>Cover camera lens with palm</Text>
              <Text style={styles.gestureNote}>Hold for 2 seconds</Text>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceBadgeText}>90% confidence</Text>
              </View>
            </View>
          </View>

          {/* Test & Debug */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test & Debug</Text>
            <TouchableOpacity style={styles.testButton} onPress={handleTestAlert}>
              <Ionicons name="flask" size={20} color="#FFFFFF" />
              <Text style={styles.testButtonText}>Test Alert</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.resetButtonText}>Reset Everything</Text>
            </TouchableOpacity>
          </View>

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.aboutCard}>
              <Text style={styles.aboutText}>RAKSHAK version 1.0.0</Text>
              <Text style={styles.aboutText}>Built for VICHAR IDEATHON 2026</Text>
              <Text style={styles.aboutText}>Team: SuRaksha Squad</Text>
              <Text style={styles.aboutText}>Theme: Safety First - The Silent Guardian</Text>
              <View style={styles.techChips}>
                <View style={styles.techChip}>
                  <Text style={styles.techChipText}>React Native</Text>
                </View>
                <View style={styles.techChip}>
                  <Text style={styles.techChipText}>Expo</Text>
                </View>
                <View style={styles.techChip}>
                  <Text style={styles.techChipText}>AI Detection</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F1F5F9',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginTop: 16,
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  nameDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#F1F5F9',
    marginRight: 12,
  },
  userSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  nameEditContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  contactPhone: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  contactBadge: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
  },
  contactBadgeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  contactInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  saveContactButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  saveContactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginLeft: 8,
  },
  settingDescription: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  settingRecommended: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
  },
  sensitivityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  sensitivityButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  sensitivityButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  sensitivityButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  sensitivityButtonTextActive: {
    color: '#FFFFFF',
  },
  gestureCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  gestureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 12,
  },
  gestureVisual: {
    fontSize: 40,
    marginBottom: 12,
  },
  gestureDescription: {
    fontSize: 14,
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 8,
  },
  gestureNote: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 12,
  },
  confidenceBadge: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  confidenceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 16,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  aboutCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  aboutText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  techChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  techChip: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  techChipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});

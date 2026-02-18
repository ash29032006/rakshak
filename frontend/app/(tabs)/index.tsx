import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { useApp } from '../contexts/AppContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DetectionManager from '../components/DetectionManager';
import { voiceDetector } from '../utils/voiceDetection';
import { gestureDetector } from '../utils/gestureDetection';

export default function Home() {
  const {
    userName,
    protectionActive,
    alertState,
    sensitivity,
    emergencyContacts,
    toggleProtection,
    setSensitivity,
    triggerAlert,
    cancelAlert,
    voiceDetectionEnabled,
    gestureDetectionEnabled,
    behavioralDetectionEnabled,
    detectionState,
  } = useApp();

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [countdown, setCountdown] = React.useState(5);
  const [showDetectionScores, setShowDetectionScores] = React.useState(false);

  // Shield breathing animation
  useEffect(() => {
    if (protectionActive && alertState === 'idle') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [protectionActive, alertState]);

  // Countdown timer for alert
  useEffect(() => {
    if (alertState === 'alert') {
      setCountdown(5);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [alertState]);

  const handleShieldPress = () => {
    toggleProtection();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleTestAlert = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    triggerAlert('manual', 0.95);
    
    // Simulate haptic SOS: ··· ——— ···
    setTimeout(() => {
      // S: short-short-short
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 200);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 400);
      // O: long-long-long
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 700);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 1100);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 1500);
      // S: short-short-short
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 1900);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 2100);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 2300);
    }, 100);
  };

  const handleCancelAlert = () => {
    if (countdown > 0) {
      cancelAlert();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const getShieldColor = () => {
    if (alertState === 'alert') return '#DC2626';
    if (protectionActive) return '#10B981';
    return '#475569';
  };

  const getShieldText = () => {
    if (alertState === 'alert') return 'ALERT SENT';
    if (protectionActive) return 'PROTECTED';
    return 'PROTECTION OFF';
  };

  const getShieldSubtext = () => {
    if (alertState === 'alert') return 'Help is on the way';
    if (protectionActive) return 'Tap to toggle off';
    return 'Tap to enable';
  };

  const getSensitivityThreshold = () => {
    if (sensitivity === 'low') return '85% - Fewer false alerts';
    if (sensitivity === 'medium') return '75% - Recommended';
    return '65% - More sensitive';
  };

  if (alertState === 'alert') {
    return (
      <View style={styles.alertOverlay}>
        <ScrollView contentContainerStyle={styles.alertContent}>
          <View style={styles.alertHeader}>
            <Ionicons name="warning" size={80} color="#FFFFFF" />
            <Text style={styles.alertTitle}>HELP IS COMING</Text>
            <Text style={styles.alertSubtitle}>Alert sent to {emergencyContacts.length} contacts</Text>
          </View>

          <View style={styles.hapticBox}>
            <Text style={styles.hapticMorse}>· · ·   — — —   · · ·</Text>
            <Text style={styles.hapticLabel}>Only you feel this</Text>
            <Text style={styles.hapticSubtitle}>SOS in Morse Code</Text>
          </View>

          <View style={styles.detectionInfo}>
            <Text style={styles.detectionText}>Detected: Manual Test</Text>
            <Text style={styles.detectionText}>Confidence: 95%</Text>
            <Text style={styles.detectionText}>Time: {new Date().toLocaleTimeString()}</Text>
          </View>

          <View style={styles.timelineContainer}>
            <View style={styles.timelineItem}>
              <Ionicons name="radio-button-on" size={20} color="#DC2626" />
              <Text style={styles.timelineText}>Alert triggered</Text>
            </View>
            <View style={styles.timelineItem}>
              <Ionicons name="phone-portrait" size={20} color="#DC2626" />
              <Text style={styles.timelineText}>Haptic SOS sent (only you feel this)</Text>
            </View>
            <View style={styles.timelineItem}>
              <Ionicons name="mail" size={20} color="#DC2626" />
              <Text style={styles.timelineText}>SMS sent to {emergencyContacts.length} contacts</Text>
            </View>
            <View style={styles.timelineItem}>
              <Ionicons name="location" size={20} color="#DC2626" />
              <Text style={styles.timelineText}>Location captured</Text>
            </View>
            <View style={styles.timelineItem}>
              <Ionicons name="mic" size={20} color="#DC2626" />
              <Text style={styles.timelineText}>Recording started</Text>
            </View>
            <View style={styles.timelineItem}>
              <Ionicons name="radio" size={20} color="#DC2626" />
              <Text style={styles.timelineText}>Live tracking active</Text>
            </View>
          </View>

          {countdown > 0 && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelAlert}>
              <Text style={styles.cancelButtonText}>Cancel ({countdown}...)</Text>
            </TouchableOpacity>
          )}

          {countdown === 0 && (
            <Text style={styles.confirmedText}>✓ Alert Confirmed</Text>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>RAKSHAK</Text>
          <Text style={styles.headerTime}>{new Date().toLocaleTimeString()}</Text>
        </View>

        {/* Shield */}
        <View style={styles.shieldSection}>
          <TouchableOpacity onPress={handleShieldPress} activeOpacity={0.8}>
            <Animated.View style={[styles.shieldContainer, { transform: [{ scale: scaleAnim }] }]}>
              <View style={[styles.shield, { backgroundColor: getShieldColor() }]}>
                <Ionicons name="shield-checkmark" size={120} color="#FFFFFF" />
              </View>
            </Animated.View>
          </TouchableOpacity>
          <Text style={[styles.shieldText, { color: getShieldColor() }]}>{getShieldText()}</Text>
          <Text style={styles.shieldSubtext}>{getShieldSubtext()}</Text>
        </View>

        {/* Status Panel */}
        <View style={styles.statusPanel}>
          <Text style={styles.sectionTitle}>Module Status</Text>
          
          <View style={styles.moduleRow}>
            <Ionicons name="mic" size={20} color="#10B981" />
            <Text style={styles.moduleText}>Voice Detection</Text>
            <View style={styles.moduleSpacer} />
            {voiceDetectionEnabled && <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />}
            <Text style={[styles.moduleStatus, voiceDetectionEnabled && { color: '#10B981' }]}>
              {voiceDetectionEnabled ? 'LISTENING' : 'OFF'}
            </Text>
          </View>

          <View style={styles.moduleRow}>
            <Ionicons name="hand-left" size={20} color="#8B5CF6" />
            <Text style={styles.moduleText}>Gesture Detection</Text>
            <View style={styles.moduleSpacer} />
            {gestureDetectionEnabled && <View style={[styles.statusDot, { backgroundColor: '#8B5CF6' }]} />}
            <Text style={[styles.moduleStatus, gestureDetectionEnabled && { color: '#8B5CF6' }]}>
              {gestureDetectionEnabled ? 'WATCHING' : 'OFF'}
            </Text>
          </View>

          <View style={styles.moduleRow}>
            <Ionicons name="cellular" size={20} color="#3B82F6" />
            <Text style={styles.moduleText}>Behavioral</Text>
            <View style={styles.moduleSpacer} />
            {behavioralDetectionEnabled && <View style={[styles.statusDot, { backgroundColor: '#3B82F6' }]} />}
            <Text style={[styles.moduleStatus, behavioralDetectionEnabled && { color: '#3B82F6' }]}>
              {behavioralDetectionEnabled ? 'ACTIVE' : 'OFF'}
            </Text>
          </View>
        </View>

        {/* Contacts Bar */}
        <View style={styles.contactsBar}>
          <Ionicons name="people" size={20} color="#10B981" />
          <Text style={styles.contactsText}>{emergencyContacts.length} Emergency Contacts Active</Text>
        </View>

        {/* Sensitivity Selector */}
        <View style={styles.sensitivitySection}>
          <Text style={styles.sectionTitle}>Sensitivity</Text>
          <View style={styles.sensitivityButtons}>
            <TouchableOpacity
              style={[styles.sensitivityButton, sensitivity === 'low' && styles.sensitivityButtonActive]}
              onPress={() => {
                setSensitivity('low');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.sensitivityButtonText, sensitivity === 'low' && styles.sensitivityButtonTextActive]}>
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
                style={[styles.sensitivityButtonText, sensitivity === 'medium' && styles.sensitivityButtonTextActive]}
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
              <Text style={[styles.sensitivityButtonText, sensitivity === 'high' && styles.sensitivityButtonTextActive]}>
                HIGH
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sensitivityInfo}>{getSensitivityThreshold()}</Text>
        </View>

        {/* Test Button */}
        <TouchableOpacity style={styles.testButton} onPress={handleTestAlert}>
          <Ionicons name="flask" size={20} color="#FFFFFF" />
          <Text style={styles.testButtonText}>Test Alert</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F1F5F9',
  },
  headerTime: {
    fontSize: 13,
    color: '#64748B',
  },
  shieldSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  shieldContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  shield: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
  },
  shieldSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  statusPanel: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 16,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  moduleText: {
    fontSize: 15,
    color: '#F1F5F9',
    marginLeft: 12,
  },
  moduleSpacer: {
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  moduleStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  contactsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contactsText: {
    fontSize: 15,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 12,
  },
  sensitivitySection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sensitivityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sensitivityButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
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
  sensitivityInfo: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginTop: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 20,
  },
  // Alert Overlay Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: '#DC2626',
  },
  alertContent: {
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  alertHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  alertTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  alertSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 8,
  },
  hapticBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  hapticMorse: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  hapticLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  hapticSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  detectionInfo: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detectionText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  timelineContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timelineText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  confirmedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

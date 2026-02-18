import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useApp } from '../contexts/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function Dashboard() {
  const { alertState, currentAlert, emergencyContacts, userName, resolveAlert } = useApp();
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (alertState === 'alert' && currentAlert) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - currentAlert.timestamp.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [alertState, currentAlert]);

  const formatElapsedTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  };

  const openMaps = () => {
    const url = `https://maps.google.com/?q=12.9716,77.5946`;
    Linking.openURL(url);
  };

  const callPolice = () => {
    Linking.openURL('tel:112');
  };

  if (alertState !== 'alert' || !currentAlert) {
    return (
      <View style={styles.container}>
        <View style={styles.idleContainer}>
          <Ionicons name="eye" size={80} color="#3B82F6" style={styles.pulsingIcon} />
          <Text style={styles.idleTitle}>Monitoring Active</Text>
          <Text style={styles.idleSubtitle}>No active alerts</Text>
          <Text style={styles.idleDescription}>Dashboard activates when RAKSHAK detects distress</Text>

          <View style={styles.howToBox}>
            <Text style={styles.howToTitle}>To test the system:</Text>
            <Text style={styles.howToItem}>• Say 'help me' clearly</Text>
            <Text style={styles.howToItem}>• Show open palm then close fist toward camera</Text>
            <Text style={styles.howToItem}>• Wave hand rapidly 4+ times</Text>
            <Text style={styles.howToItem}>• Cover camera for 2 seconds</Text>
          </View>

          <View style={styles.tipBox}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={styles.tipText}>Protection must be ON on the Home screen</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Alert Header */}
        <View style={styles.alertHeader}>
          <Ionicons name="warning" size={40} color="#FFFFFF" />
          <View style={styles.alertHeaderText}>
            <Text style={styles.alertHeaderTitle}>EMERGENCY ALERT ACTIVE</Text>
            <Text style={styles.alertHeaderSubtitle}>{userName || 'User'} triggered an emergency alert</Text>
            <Text style={styles.alertHeaderTime}>{formatElapsedTime(elapsedTime)}</Text>
          </View>
        </View>

        {/* Alert Info Card */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color="#F1F5F9" />
            <Text style={styles.infoLabel}>Who:</Text>
            <Text style={styles.infoValue}>{userName || 'User'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={20} color="#F1F5F9" />
            <Text style={styles.infoLabel}>When:</Text>
            <Text style={styles.infoValue}>{format(currentAlert.timestamp, 'PPpp')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="search" size={20} color="#F1F5F9" />
            <Text style={styles.infoLabel}>How detected:</Text>
            <Text style={styles.infoValue}>{currentAlert.detectionType}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="stats-chart" size={20} color="#F1F5F9" />
            <Text style={styles.infoLabel}>Confidence:</Text>
            <Text style={[styles.infoValue, styles.confidenceBadge]}>{Math.round(currentAlert.confidence * 100)}%</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="battery-half" size={20} color="#F1F5F9" />
            <Text style={styles.infoLabel}>Battery:</Text>
            <Text style={styles.infoValue}>67%</Text>
          </View>
          <View style={styles.silentModeRow}>
            <Ionicons name="volume-mute" size={20} color="#DC2626" />
            <Text style={styles.infoLabel}>Mode:</Text>
            <Text style={styles.infoValue}>SILENT</Text>
            <View style={styles.warningBadge}>
              <Text style={styles.warningBadgeText}>DO NOT CALL VICTIM</Text>
            </View>
          </View>
        </View>

        {/* Location Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={24} color="#DC2626" />
            <Text style={styles.cardTitle}>Live Location</Text>
          </View>
          <View style={styles.locationBox}>
            <View style={styles.locationPin}>
              <Ionicons name="pin" size={40} color="#DC2626" />
            </View>
            <Text style={styles.locationName}>Koramangala, Bangalore</Text>
            <Text style={styles.locationCoords}>12.9716°N, 77.5946°E</Text>
            <Text style={styles.locationUpdate}>Last updated: just now</Text>
          </View>
          <TouchableOpacity style={styles.mapButton} onPress={openMaps}>
            <Text style={styles.mapButtonText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>

        {/* SMS Preview Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="mail" size={24} color="#10B981" />
            <Text style={styles.cardTitle}>SMS Sent to {emergencyContacts.length} Contacts</Text>
          </View>
          <View style={styles.contactBadges}>
            {emergencyContacts.map((contact) => (
              <View key={contact.id} style={styles.contactBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.contactBadgeText}>{contact.name}</Text>
              </View>
            ))}
          </View>
          <View style={styles.deliveryBadge}>
            <Text style={styles.deliveryBadgeText}>Delivered ✓✓</Text>
          </View>
          <View style={styles.smsPreview}>
            <Text style={styles.smsPreviewTitle}>🚨 SILENT DISTRESS ALERT</Text>
            <Text style={styles.smsPreviewText}>{userName || 'User'} triggered emergency alert.</Text>
            <Text style={styles.smsPreviewText}>📍 Location: [map link]</Text>
            <Text style={styles.smsPreviewText}>🕐 Time: {format(currentAlert.timestamp, 'PPpp')}</Text>
            <Text style={styles.smsPreviewText}>🔋 Battery: 67%</Text>
            <Text style={styles.smsPreviewText}>Detection: {currentAlert.detectionType}</Text>
            <Text style={styles.smsPreviewText}>Confidence: {Math.round(currentAlert.confidence * 100)}%</Text>
            <Text style={[styles.smsPreviewText, styles.smsPreviewWarning]}>⚠️ SILENT MODE ACTIVE</Text>
            <Text style={[styles.smsPreviewText, styles.smsPreviewWarning]}>Victim's phone shows NO alerts.</Text>
            <Text style={[styles.smsPreviewText, styles.smsPreviewWarning]}>DO NOT CALL - send help immediately.</Text>
          </View>
        </View>

        {/* Recording Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="radio-button-on" size={24} color="#DC2626" />
            <Text style={styles.cardTitle}>LIVE Recording in Progress</Text>
          </View>
          <View style={styles.waveformContainer}>
            {[...Array(20)].map((_, i) => (
              <View key={i} style={[styles.waveformBar, { height: Math.random() * 40 + 20 }]} />
            ))}
          </View>
          <Text style={styles.recordingTime}>0:{elapsedTime.toString().padStart(2, '0')}</Text>
          <Text style={styles.recordingSubtitle}>Audio evidence being captured</Text>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.policeButton} onPress={callPolice}>
          <Ionicons name="call" size={24} color="#FFFFFF" />
          <Text style={styles.policeButtonText}>Call Police (112)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navigateButton} onPress={openMaps}>
          <Ionicons name="navigate" size={24} color="#FFFFFF" />
          <Text style={styles.navigateButtonText}>Navigate There</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resolveButton} onPress={resolveAlert}>
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
          <Text style={styles.resolveButtonText}>Mark Resolved</Text>
        </TouchableOpacity>

        {/* Alert Timeline Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="list" size={24} color="#3B82F6" />
            <Text style={styles.cardTitle}>Alert Timeline</Text>
          </View>
          {currentAlert.timeline.map((event, index) => (
            <View key={event.id} style={styles.timelineItem}>
              <Ionicons
                name={event.type === 'trigger' ? 'radio-button-on' : event.type === 'haptic' ? 'phone-portrait' : event.type === 'sms' ? 'mail' : event.type === 'location' ? 'location' : event.type === 'recording' ? 'mic' : 'radio'}
                size={20}
                color="#DC2626"
              />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>{event.label}</Text>
                <Text style={styles.timelineDetail}>{event.detail}</Text>
              </View>
            </View>
          ))}
        </View>
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
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  // Idle State
  idleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  pulsingIcon: {
    marginBottom: 24,
  },
  idleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  idleSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 8,
  },
  idleDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
  howToBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  howToTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 12,
  },
  howToItem: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    width: '100%',
  },
  tipText: {
    fontSize: 13,
    color: '#3B82F6',
    marginLeft: 8,
    flex: 1,
  },
  // Alert Active State
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  alertHeaderText: {
    flex: 1,
    marginLeft: 16,
  },
  alertHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  alertHeaderSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  alertHeaderTime: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
    marginLeft: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginLeft: 8,
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#F1F5F9',
    fontWeight: '500',
  },
  confidenceBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    color: '#FFFFFF',
  },
  silentModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  warningBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  warningBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  locationBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  locationPin: {
    marginBottom: 12,
  },
  locationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  locationCoords: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  locationUpdate: {
    fontSize: 12,
    color: '#64748B',
  },
  mapButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  mapButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  contactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  contactBadgeText: {
    fontSize: 13,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '600',
  },
  deliveryBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  deliveryBadgeText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  smsPreview: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 16,
  },
  smsPreviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 12,
  },
  smsPreviewText: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 4,
  },
  smsPreviewWarning: {
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 8,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 60,
    marginVertical: 16,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#DC2626',
    borderRadius: 2,
  },
  recordingTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 4,
  },
  recordingSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  policeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  policeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  navigateButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  resolveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
  },
  timelineLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 2,
  },
  timelineDetail: {
    fontSize: 13,
    color: '#94A3B8',
  },
});

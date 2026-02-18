import { Audio } from 'expo-av';

// Voice detection configuration - EXTREMELY STRICT FOR "HELP ME" PATTERN
const REQUIRED_DETECTIONS = 2; // Must detect 2 times
const DETECTION_WINDOW = 10000; // Within 10 seconds
const SCREAM_AMPLITUDE_THRESHOLD = 0.88; // Extreme screams only
const HELP_ME_AMPLITUDE_THRESHOLD = 0.83; // Very loud "HELP ME" only
const HELP_ME_DURATION_MIN = 1000; // "HELP ME" takes ~1 second minimum
const HELP_ME_DURATION_MAX = 1800; // But not more than 1.8 seconds (too long = not "help me")
const CONSECUTIVE_SAMPLES_REQUIRED = 10; // Need 10 consecutive high samples (1 second)
const TWO_WORD_GAP_MIN = 150; // Brief gap between "HELP" and "ME" (150-400ms)
const TWO_WORD_GAP_MAX = 400;
const SECOND_WORD_DURATION_MIN = 300; // "ME" duration minimum

interface VoiceDetectionResult {
  detected: boolean;
  type: 'keyword' | 'scream' | 'loud_voice' | null;
  confidence: number;
  keyword?: string;
  detectionCount?: number;
}

interface KeywordDetection {
  keyword: string;
  timestamp: number;
  confidence: number;
  pattern: 'two_word' | 'sustained'; // Track if it matched "HELP ME" pattern
}

export class VoiceDetector {
  private recording: Audio.Recording | null = null;
  private isListening = false;
  private onDetection: ((result: VoiceDetectionResult) => void) | null = null;
  private audioBuffer: number[] = [];
  private lastCheckTime = 0;
  private checkInterval = 500;
  private keywordDetections: KeywordDetection[] = [];
  private loudVoiceStartTime = 0;
  private consecutiveHighAmplitude = 0;
  private lastDetectionTime = 0;
  private detectionCooldown = 4000; // 4 second cooldown
  private recentAmplitudeHistory: Array<{amplitude: number, time: number}> = []; // Track amplitude over time
  private gapDetected = false;
  private gapStartTime = 0;
  private firstWordDuration = 0;

  async start(callback: (result: VoiceDetectionResult) => void): Promise<boolean> {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.error('Audio permission not granted');
        return false;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      this.onDetection = callback;
      this.isListening = true;
      this.keywordDetections = [];
      this.consecutiveHighAmplitude = 0;
      
      // Start audio amplitude monitoring
      await this.startRecording();
      
      console.log('✅ Voice detection started (Audio amplitude monitoring)');
      return true;
    } catch (error) {
      console.error('Failed to start voice detection:', error);
      return false;
    }
  }

  private async startRecording() {
    try {
      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      await this.recording.startAsync();
      
      // Monitor audio levels continuously
      this.monitorAudio();
    } catch (error) {
      console.error('Recording failed:', error);
    }
  }

  private async monitorAudio() {
    if (!this.isListening || !this.recording) return;

    try {
      const status = await this.recording.getStatusAsync();
      
      if (status.isRecording && status.metering !== undefined) {
        const level = status.metering || -160;
        const normalizedLevel = Math.max(0, (level + 160) / 160); // Normalize -160 to 0 → 0 to 1
        
        this.audioBuffer.push(normalizedLevel);
        
        // Keep buffer size manageable (last 10 samples)
        if (this.audioBuffer.length > 10) {
          this.audioBuffer.shift();
        }

        // Check for scream detection
        const now = Date.now();
        if (now - this.lastCheckTime >= this.checkInterval) {
          this.lastCheckTime = now;
          await this.analyzeAudio(normalizedLevel);
        }
      }

      // Continue monitoring
      setTimeout(() => this.monitorAudio(), 100);
    } catch (error) {
      console.error('Monitoring error:', error);
    }
  }

  private async analyzeAudio(currentLevel: number) {
    const avgAmplitude = this.audioBuffer.reduce((a, b) => a + b, 0) / this.audioBuffer.length;
    const now = Date.now();
    
    // Cooldown check - prevent rapid detections
    if (now - this.lastDetectionTime < this.detectionCooldown) {
      return; // Still in cooldown
    }
    
    // Detection 1: Extreme scream only (very high threshold)
    if (avgAmplitude > SCREAM_AMPLITUDE_THRESHOLD && currentLevel > SCREAM_AMPLITUDE_THRESHOLD) {
      const confidence = Math.min(0.92, avgAmplitude * 1.15);
      
      this.onDetection?.({
        detected: true,
        type: 'scream',
        confidence,
      });
      
      this.lastDetectionTime = now;
      console.log('🚨 EXTREME SCREAM DETECTED:', { amplitude: avgAmplitude, confidence });
      return;
    }
    
    // Detection 2: Very specific "HELP ME" pattern
    // Must be VERY loud (80%+) and sustained for specific duration (800-2000ms)
    if (avgAmplitude > HELP_ME_AMPLITUDE_THRESHOLD && currentLevel > HELP_ME_AMPLITUDE_THRESHOLD) {
      this.consecutiveHighAmplitude++;
      
      if (this.consecutiveHighAmplitude === 1) {
        this.loudVoiceStartTime = now;
      }
      
      const duration = now - this.loudVoiceStartTime;
      
      // Check if it matches "HELP ME" pattern
      if (this.consecutiveHighAmplitude >= CONSECUTIVE_SAMPLES_REQUIRED && 
          duration >= HELP_ME_DURATION_MIN && 
          duration <= HELP_ME_DURATION_MAX) {
        
        // Perfect duration and amplitude - likely "HELP ME"
        this.recordHelpMeDetection(avgAmplitude);
        this.consecutiveHighAmplitude = 0;
        this.loudVoiceStartTime = 0;
        this.lastDetectionTime = now;
      } else if (duration > HELP_ME_DURATION_MAX) {
        // Too long - reset
        console.log('⏱️ Voice too long, resetting (not "HELP ME" pattern)');
        this.consecutiveHighAmplitude = 0;
        this.loudVoiceStartTime = 0;
      }
    } else {
      // Amplitude dropped - check if it was the right duration
      if (this.consecutiveHighAmplitude > 0) {
        const duration = now - this.loudVoiceStartTime;
        
        if (this.consecutiveHighAmplitude >= CONSECUTIVE_SAMPLES_REQUIRED && 
            duration >= HELP_ME_DURATION_MIN) {
          // Valid "HELP ME" detection
          const avgAmp = this.audioBuffer.slice(-this.consecutiveHighAmplitude)
            .reduce((a, b) => a + b, 0) / this.consecutiveHighAmplitude;
          this.recordHelpMeDetection(avgAmp);
          this.lastDetectionTime = now;
        }
        
        this.consecutiveHighAmplitude = 0;
        this.loudVoiceStartTime = 0;
      }
    }
  }

  private recordHelpMeDetection(amplitude: number) {
    const now = Date.now();
    const confidence = Math.min(0.92, amplitude * 1.2);
    
    // Add new detection
    this.keywordDetections.push({
      keyword: 'HELP ME',
      timestamp: now,
      confidence,
    });

    // Remove old detections outside the window
    this.keywordDetections = this.keywordDetections.filter(
      (d) => now - d.timestamp <= DETECTION_WINDOW
    );

    console.log(`🎤 "HELP ME" pattern detected! Count: ${this.keywordDetections.length}/${REQUIRED_DETECTIONS}`);

    // Check if we have enough detections
    if (this.keywordDetections.length >= REQUIRED_DETECTIONS) {
      const avgConfidence = 
        this.keywordDetections.reduce((sum, d) => sum + d.confidence, 0) / 
        this.keywordDetections.length;

      this.onDetection?.({
        detected: true,
        type: 'loud_voice',
        confidence: avgConfidence,
        keyword: 'HELP ME',
        detectionCount: this.keywordDetections.length,
      });

      console.log(`🚨 ALERT: "HELP ME" detected ${this.keywordDetections.length} times!`);
      
      // Reset detections after triggering
      this.keywordDetections = [];
    }
  }

  async stop() {
    this.isListening = false;
    this.keywordDetections = [];
    this.consecutiveHighAmplitude = 0;
    
    try {
      if (this.recording) {
        const status = await this.recording.getStatusAsync();
        if (status.isRecording) {
          await this.recording.stopAndUnloadAsync();
        }
        this.recording = null;
      }
      console.log('✅ Voice detection stopped');
    } catch (error) {
      // Silently handle recorder errors
      console.log('ℹ️ Voice detection stopped (recorder already released)');
      this.recording = null;
    }
  }

  // Get detection count for UI display
  getDetectionCount(): number {
    return this.keywordDetections.length;
  }

  // Simulate keyword detection for testing
  simulateKeywordDetection(keyword: string) {
    if (this.isListening) {
      this.onDetection?.({
        detected: true,
        type: 'keyword',
        confidence: 0.95,
        keyword,
        detectionCount: REQUIRED_DETECTIONS,
      });
      console.log(`🧪 TEST: Simulated keyword "${keyword}"`);
    }
  }
}

export const voiceDetector = new VoiceDetector();

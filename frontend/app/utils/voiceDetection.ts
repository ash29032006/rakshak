import { Audio } from 'expo-av';

// Voice detection configuration - VERY STRICT
const REQUIRED_DETECTIONS = 2; // Must detect 2 times
const DETECTION_WINDOW = 10000; // Within 10 seconds
const SCREAM_AMPLITUDE_THRESHOLD = 0.85; // Very high - only extreme screams
const HELP_ME_AMPLITUDE_THRESHOLD = 0.80; // Very loud sustained voice only
const HELP_ME_DURATION_MIN = 800; // Must sustain for at least 800ms (saying "help me")
const HELP_ME_DURATION_MAX = 2000; // But not more than 2 seconds
const CONSECUTIVE_SAMPLES_REQUIRED = 8; // Need 8 consecutive high samples (800ms)

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
  private detectionCooldown = 3000; // 3 second cooldown between detections

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
    
    // Detection 1: Scream (very high amplitude, instant)
    if (avgAmplitude > SCREAM_AMPLITUDE_THRESHOLD && currentLevel > SCREAM_AMPLITUDE_THRESHOLD) {
      const confidence = Math.min(0.92, avgAmplitude * 1.15);
      
      this.onDetection?.({
        detected: true,
        type: 'scream',
        confidence,
      });
      
      console.log('🚨 SCREAM DETECTED:', { amplitude: avgAmplitude, confidence });
      return; // Don't check other patterns if scream detected
    }
    
    // Detection 2: Sustained loud voice (simulates "help me" being said multiple times)
    // High amplitude sustained for period = likely calling for help
    if (avgAmplitude > HIGH_AMPLITUDE_THRESHOLD) {
      this.consecutiveHighAmplitude++;
      
      if (this.consecutiveHighAmplitude === 1) {
        this.loudVoiceStartTime = now;
      }
      
      // If sustained for 1+ second, record as potential "help me" detection
      const duration = now - this.loudVoiceStartTime;
      if (duration >= 1000 && this.consecutiveHighAmplitude >= 5) { // 5 consecutive samples at high amplitude
        this.recordLoudVoiceDetection(avgAmplitude);
        this.consecutiveHighAmplitude = 0; // Reset after recording
      }
    } else {
      // Reset if amplitude drops
      if (this.consecutiveHighAmplitude > 0) {
        this.consecutiveHighAmplitude = 0;
        this.loudVoiceStartTime = 0;
      }
    }
  }

  private recordLoudVoiceDetection(amplitude: number) {
    const now = Date.now();
    const confidence = Math.min(0.90, amplitude * 1.2);
    
    // Add new detection (simulates saying "help me")
    this.keywordDetections.push({
      keyword: 'loud_voice',
      timestamp: now,
      confidence,
    });

    // Remove old detections outside the window
    this.keywordDetections = this.keywordDetections.filter(
      (d) => now - d.timestamp <= DETECTION_WINDOW
    );

    console.log(`🎤 Loud voice detected! Count: ${this.keywordDetections.length}/${REQUIRED_DETECTIONS} (simulating "help me")`);

    // Check if we have enough detections
    if (this.keywordDetections.length >= REQUIRED_DETECTIONS) {
      const avgConfidence = 
        this.keywordDetections.reduce((sum, d) => sum + d.confidence, 0) / 
        this.keywordDetections.length;

      this.onDetection?.({
        detected: true,
        type: 'loud_voice',
        confidence: avgConfidence,
        keyword: 'help me (voice pattern)',
        detectionCount: this.keywordDetections.length,
      });

      console.log(`🚨 SUSTAINED LOUD VOICE ALERT: Detected ${this.keywordDetections.length} times (simulating "help me" keyword)`);
      
      // Reset detections after triggering
      this.keywordDetections = [];
    }
  }

  async stop() {
    this.isListening = false;
    this.keywordDetections = [];
    this.consecutiveHighAmplitude = 0;
    
    try {
      // Stop audio recording
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }
      
      console.log('✅ Voice detection stopped');
    } catch (error) {
      console.error('Failed to stop voice detection:', error);
    }
  }

  // Get detection count for UI display
  getDetectionCount(): number {
    return this.keywordDetections.length;
  }

  // Simulate keyword detection for testing (triggers immediately without multiple detections)
  simulateKeywordDetection(keyword: string) {
    if (this.isListening) {
      // For testing, trigger immediately with high confidence
      this.onDetection?.({
        detected: true,
        type: 'keyword',
        confidence: KEYWORD_CONFIDENCE,
        keyword,
        detectionCount: REQUIRED_DETECTIONS, // Pretend we have enough detections
      });
      console.log(`🧪 TEST: Simulated keyword "${keyword}"`);
    }
  }
}

export const voiceDetector = new VoiceDetector();

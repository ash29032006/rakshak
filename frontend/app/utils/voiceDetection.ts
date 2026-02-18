import { Audio } from 'expo-av';

// Voice detection configuration
const TARGET_KEYWORDS = ['help me', 'help'];
const HINDI_KEYWORDS = ['bachao', 'bacho'];
const REQUIRED_DETECTIONS = 2; // Must detect keyword 2 times
const DETECTION_WINDOW = 10000; // Within 10 seconds
const SCREAM_AMPLITUDE_THRESHOLD = 0.75;
const HIGH_AMPLITUDE_THRESHOLD = 0.70; // For sustained loud sounds
const KEYWORD_CONFIDENCE = 0.90; // Simulated confidence for testing

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
  private checkInterval = 500; // Check every 500ms
  private keywordDetections: KeywordDetection[] = [];
  private loudVoiceStartTime = 0;
  private consecutiveHighAmplitude = 0;

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
    // Enhanced scream detection with higher threshold
    const avgAmplitude = this.audioBuffer.reduce((a, b) => a + b, 0) / this.audioBuffer.length;
    
    if (avgAmplitude > SCREAM_AMPLITUDE_THRESHOLD && currentLevel > SCREAM_AMPLITUDE_THRESHOLD) {
      // High amplitude detected - likely scream
      const confidence = Math.min(0.92, avgAmplitude * 1.15);
      
      this.onDetection?.({
        detected: true,
        type: 'scream',
        confidence,
      });
      
      console.log('🚨 SCREAM DETECTED:', { amplitude: avgAmplitude, confidence });
    }
  }

  async stop() {
    this.isListening = false;
    this.keywordDetections = [];
    
    try {
      // Stop speech recognition
      if (this.isRecognizing && this.recognitionSupported) {
        await ExpoSpeechRecognitionModule.stop();
        ExpoSpeechRecognitionModule.removeAllListeners();
        this.isRecognizing = false;
      }

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
        confidence: 0.95,
        keyword,
        detectionCount: REQUIRED_DETECTIONS, // Pretend we have enough detections
      });
      console.log(`🧪 TEST: Simulated keyword "${keyword}"`);
    }
  }
}

export const voiceDetector = new VoiceDetector();

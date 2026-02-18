import { Audio } from 'expo-av';

// Voice detection configuration
const KEYWORDS = ['help', 'help me', 'bachao', 'bacho', 'stop'];
const SCREAM_FREQUENCY_THRESHOLD = 400; // Hz
const SCREAM_AMPLITUDE_THRESHOLD = 0.7;
const SCREAM_DURATION_MS = 500;

interface VoiceDetectionResult {
  detected: boolean;
  type: 'keyword' | 'scream' | null;
  confidence: number;
  keyword?: string;
}

export class VoiceDetector {
  private recording: Audio.Recording | null = null;
  private isListening = false;
  private onDetection: ((result: VoiceDetectionResult) => void) | null = null;
  private audioBuffer: number[] = [];
  private lastCheckTime = 0;
  private checkInterval = 1000; // Check every 1 second

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
      
      // Start continuous monitoring
      await this.startRecording();
      
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
    // Scream detection: sustained high amplitude
    const avgAmplitude = this.audioBuffer.reduce((a, b) => a + b, 0) / this.audioBuffer.length;
    
    if (avgAmplitude > SCREAM_AMPLITUDE_THRESHOLD && currentLevel > SCREAM_AMPLITUDE_THRESHOLD) {
      // High amplitude detected - likely scream
      const confidence = Math.min(0.95, avgAmplitude * 1.1);
      
      this.onDetection?.({
        detected: true,
        type: 'scream',
        confidence,
      });
      
      console.log('🚨 SCREAM DETECTED:', { amplitude: avgAmplitude, confidence });
    }

    // For keyword detection, we would need speech-to-text
    // For now, we'll use amplitude patterns as a proxy
    // In production, integrate with expo-speech-recognition or cloud STT
  }

  async stop() {
    this.isListening = false;
    
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }

  // Simulate keyword detection for testing
  simulateKeywordDetection(keyword: string) {
    if (this.isListening) {
      this.onDetection?.({
        detected: true,
        type: 'keyword',
        confidence: 0.95,
        keyword,
      });
    }
  }
}

export const voiceDetector = new VoiceDetector();

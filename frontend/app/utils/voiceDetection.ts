import { Audio } from 'expo-av';
import {
  useSpeechRecognitionEvent,
  ExpoSpeechRecognitionModule,
  SpeechRecognitionErrorCode,
} from 'expo-speech-recognition';

// Voice detection configuration
const TARGET_KEYWORDS = ['help me', 'help'];
const HINDI_KEYWORDS = ['bachao', 'bacho'];
const REQUIRED_DETECTIONS = 2; // Must detect keyword 2 times
const DETECTION_WINDOW = 10000; // Within 10 seconds
const SCREAM_AMPLITUDE_THRESHOLD = 0.75;
const KEYWORD_CONFIDENCE_THRESHOLD = 0.85;

interface VoiceDetectionResult {
  detected: boolean;
  type: 'keyword' | 'scream' | null;
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
  private recognitionSupported = false;
  private keywordDetections: KeywordDetection[] = [];
  private isRecognizing = false;

  async start(callback: (result: VoiceDetectionResult) => void): Promise<boolean> {
    try {
      // Check if speech recognition is supported
      const result = await ExpoSpeechRecognitionModule.getStateAsync();
      this.recognitionSupported = result.available;

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
      
      // Start speech recognition if supported
      if (this.recognitionSupported) {
        await this.startSpeechRecognition();
      }
      
      // Start audio amplitude monitoring (for scream detection)
      await this.startRecording();
      
      console.log('✅ Voice detection started (Speech Recognition:', this.recognitionSupported, ')');
      return true;
    } catch (error) {
      console.error('Failed to start voice detection:', error);
      return false;
    }
  }

  private async startSpeechRecognition() {
    try {
      const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Speech recognition permission not granted');
        return;
      }

      // Start continuous speech recognition
      await ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 1,
        continuous: true,
        requiresOnDeviceRecognition: false,
        addsPunctuation: false,
        contextualStrings: TARGET_KEYWORDS,
      });

      this.isRecognizing = true;

      // Listen for speech recognition results
      ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
        this.handleSpeechResult(event);
      });

      ExpoSpeechRecognitionModule.addListener('error', (event: any) => {
        console.error('Speech recognition error:', event);
        if (event.error !== SpeechRecognitionErrorCode.NoMatch) {
          // Restart recognition on error (except no match)
          setTimeout(() => {
            if (this.isListening) {
              this.startSpeechRecognition();
            }
          }, 1000);
        }
      });

      ExpoSpeechRecognitionModule.addListener('end', () => {
        // Restart continuous recognition
        if (this.isListening) {
          setTimeout(() => {
            this.startSpeechRecognition();
          }, 500);
        }
      });

    } catch (error) {
      console.error('Speech recognition failed:', error);
      this.recognitionSupported = false;
    }
  }

  private handleSpeechResult(event: any) {
    if (!event.results || event.results.length === 0) return;

    const result = event.results[0];
    if (!result.transcripts || result.transcripts.length === 0) return;

    const transcript = result.transcripts[0].transcript.toLowerCase().trim();
    const confidence = result.transcripts[0].confidence || 0.5;

    console.log('📝 Speech recognized:', transcript, 'Confidence:', confidence);

    // Check for target keywords
    const detectedKeyword = this.checkForKeywords(transcript);
    
    if (detectedKeyword && confidence >= KEYWORD_CONFIDENCE_THRESHOLD) {
      this.recordKeywordDetection(detectedKeyword, confidence);
    }
  }

  private checkForKeywords(transcript: string): string | null {
    // Check English keywords
    for (const keyword of TARGET_KEYWORDS) {
      if (transcript.includes(keyword)) {
        return keyword;
      }
    }
    
    // Check Hindi keywords
    for (const keyword of HINDI_KEYWORDS) {
      if (transcript.includes(keyword)) {
        return keyword;
      }
    }
    
    return null;
  }

  private recordKeywordDetection(keyword: string, confidence: number) {
    const now = Date.now();
    
    // Add new detection
    this.keywordDetections.push({
      keyword,
      timestamp: now,
      confidence,
    });

    // Remove old detections outside the window
    this.keywordDetections = this.keywordDetections.filter(
      (d) => now - d.timestamp <= DETECTION_WINDOW
    );

    console.log(`🎤 Keyword "${keyword}" detected! Count: ${this.keywordDetections.length}/${REQUIRED_DETECTIONS}`);

    // Check if we have enough detections
    if (this.keywordDetections.length >= REQUIRED_DETECTIONS) {
      const avgConfidence = 
        this.keywordDetections.reduce((sum, d) => sum + d.confidence, 0) / 
        this.keywordDetections.length;

      this.onDetection?.({
        detected: true,
        type: 'keyword',
        confidence: avgConfidence,
        keyword,
        detectionCount: this.keywordDetections.length,
      });

      console.log(`🚨 KEYWORD ALERT TRIGGERED: "${keyword}" detected ${this.keywordDetections.length} times`);
      
      // Reset detections after triggering
      this.keywordDetections = [];
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

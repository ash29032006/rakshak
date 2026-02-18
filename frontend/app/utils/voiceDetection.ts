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
    
    // Store amplitude history for pattern analysis
    this.recentAmplitudeHistory.push({ amplitude: currentLevel, time: now });
    if (this.recentAmplitudeHistory.length > 30) {
      this.recentAmplitudeHistory.shift();
    }
    
    // Cooldown check
    if (now - this.lastDetectionTime < this.detectionCooldown) {
      return;
    }
    
    // Detection 1: Extreme scream only
    if (avgAmplitude > SCREAM_AMPLITUDE_THRESHOLD && currentLevel > SCREAM_AMPLITUDE_THRESHOLD) {
      const confidence = Math.min(0.92, avgAmplitude * 1.15);
      this.onDetection?.({
        detected: true,
        type: 'scream',
        confidence,
      });
      this.lastDetectionTime = now;
      console.log('🚨 EXTREME SCREAM DETECTED:', { amplitude: avgAmplitude });
      return;
    }
    
    // Detection 2: "HELP ME" TWO-WORD PATTERN
    // Looking for: HIGH amplitude -> brief dip -> HIGH amplitude again
    if (avgAmplitude > HELP_ME_AMPLITUDE_THRESHOLD && currentLevel > HELP_ME_AMPLITUDE_THRESHOLD) {
      this.consecutiveHighAmplitude++;
      
      if (this.consecutiveHighAmplitude === 1) {
        this.loudVoiceStartTime = now;
        this.gapDetected = false;
        this.firstWordDuration = 0;
      }
      
      const duration = now - this.loudVoiceStartTime;
      
      // Check for the two-word pattern
      if (this.consecutiveHighAmplitude >= CONSECUTIVE_SAMPLES_REQUIRED) {
        // We have sustained loud sound - check if it matches "HELP ME" pattern
        const hasTwoWordPattern = this.detectTwoWordPattern();
        
        if (hasTwoWordPattern && duration >= HELP_ME_DURATION_MIN && duration <= HELP_ME_DURATION_MAX) {
          console.log('✅ Two-word pattern detected (likely "HELP ME")');
          this.recordHelpMeDetection(avgAmplitude, 'two_word');
          this.resetVoiceState();
          this.lastDetectionTime = now;
        } else if (duration > HELP_ME_DURATION_MAX) {
          // Too long - single word or sentence
          console.log('❌ Too long - not "HELP ME" pattern, resetting');
          this.resetVoiceState();
        }
      }
    } else {
      // Amplitude dropped - check if we completed a valid pattern
      if (this.consecutiveHighAmplitude >= CONSECUTIVE_SAMPLES_REQUIRED) {
        const duration = now - this.loudVoiceStartTime;
        
        if (duration >= HELP_ME_DURATION_MIN && duration <= HELP_ME_DURATION_MAX) {
          const hasTwoWordPattern = this.detectTwoWordPattern();
          
          if (hasTwoWordPattern) {
            console.log('✅ Complete "HELP ME" pattern detected');
            const avgAmp = this.audioBuffer.slice(-this.consecutiveHighAmplitude)
              .reduce((a, b) => a + b, 0) / this.consecutiveHighAmplitude;
            this.recordHelpMeDetection(avgAmp, 'two_word');
            this.lastDetectionTime = now;
          } else {
            console.log('❌ Single word detected - not "HELP ME", ignoring');
          }
        }
      }
      
      this.resetVoiceState();
    }
  }

  // Detect two-word pattern (HELP + ME) by analyzing amplitude history
  private detectTwoWordPattern(): boolean {
    if (this.recentAmplitudeHistory.length < 15) return false;
    
    // Look for pattern: HIGH -> DIP -> HIGH
    // This matches "HELP" (pause) "ME"
    const recent = this.recentAmplitudeHistory.slice(-20);
    let foundGap = false;
    let firstWordEnd = -1;
    let secondWordStart = -1;
    
    // Find a gap (amplitude drop) in the middle
    for (let i = 3; i < recent.length - 3; i++) {
      const current = recent[i].amplitude;
      const before = (recent[i-1].amplitude + recent[i-2].amplitude + recent[i-3].amplitude) / 3;
      const after = (recent[i+1].amplitude + recent[i+2].amplitude + recent[i+3].amplitude) / 3;
      
      // Check if there's a dip between two high points
      if (before > HELP_ME_AMPLITUDE_THRESHOLD * 0.9 && 
          after > HELP_ME_AMPLITUDE_THRESHOLD * 0.9 && 
          current < HELP_ME_AMPLITUDE_THRESHOLD * 0.7) {
        
        const gapDuration = recent[i+3].time - recent[i-3].time;
        
        // Check if gap duration matches "HELP" (pause) "ME"
        if (gapDuration >= TWO_WORD_GAP_MIN && gapDuration <= TWO_WORD_GAP_MAX) {
          foundGap = true;
          firstWordEnd = i;
          secondWordStart = i + 3;
          console.log('🎯 Two-word gap detected:', { gapDuration, position: i });
          break;
        }
      }
    }
    
    // Must have found a gap to be "HELP ME"
    if (!foundGap) {
      console.log('❌ No word gap found - single word or continuous sound');
      return false;
    }
    
    // Verify second word duration (should be "ME" - shorter than "HELP")
    if (secondWordStart > 0) {
      const secondWordSamples = recent.slice(secondWordStart);
      const secondWordHighSamples = secondWordSamples.filter(s => s.amplitude > HELP_ME_AMPLITUDE_THRESHOLD * 0.85);
      
      if (secondWordHighSamples.length < 3) {
        console.log('❌ Second word too short - not "HELP ME"');
        return false;
      }
    }
    
    console.log('✅ Pattern matches "HELP ME" (two words with gap)');
    return true;
  }

  private resetVoiceState() {
    this.consecutiveHighAmplitude = 0;
    this.loudVoiceStartTime = 0;
    this.gapDetected = false;
    this.firstWordDuration = 0;
  }

  private recordHelpMeDetection(amplitude: number, pattern: 'two_word' | 'sustained') {
    const now = Date.now();
    const confidence = Math.min(0.93, amplitude * 1.25);
    
    this.keywordDetections.push({
      keyword: 'HELP ME',
      timestamp: now,
      confidence,
      pattern,
    });

    // Remove old detections
    this.keywordDetections = this.keywordDetections.filter(
      (d) => now - d.timestamp <= DETECTION_WINDOW
    );

    // Filter to only count two-word patterns
    const twoWordDetections = this.keywordDetections.filter(d => d.pattern === 'two_word');

    console.log(`🎤 "HELP ME" detected! Two-word count: ${twoWordDetections.length}/${REQUIRED_DETECTIONS}`);

    // Only trigger if we have 2 two-word pattern detections
    if (twoWordDetections.length >= REQUIRED_DETECTIONS) {
      const avgConfidence = 
        twoWordDetections.reduce((sum, d) => sum + d.confidence, 0) / 
        twoWordDetections.length;

      this.onDetection?.({
        detected: true,
        type: 'loud_voice',
        confidence: avgConfidence,
        keyword: 'HELP ME',
        detectionCount: twoWordDetections.length,
      });

      console.log(`🚨 ALERT: "HELP ME" (2-word pattern) detected ${twoWordDetections.length} times!`);
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

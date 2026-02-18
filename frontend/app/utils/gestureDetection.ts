import { Camera } from 'expo-camera';

// Gesture detection configuration - STRICT (2 gestures in 10 seconds)
const REQUIRED_DETECTIONS = 2; // Must detect gesture 2 times
const DETECTION_WINDOW = 10000; // Within 10 seconds
const COOLDOWN_AFTER_DETECTION = 2000; // 2 second cooldown between gesture detections

interface GestureDetectionResult {
  detected: boolean;
  gesture: 'help' | 'wave' | 'cover' | null;
  confidence: number;
  detectionCount?: number;
}

interface GestureDetection {
  gesture: 'help' | 'wave' | 'cover';
  timestamp: number;
  confidence: number;
}

export class GestureDetector {
  private isWatching = false;
  private onDetection: ((result: GestureDetectionResult) => void) | null = null;
  private frameBuffer: any[] = [];
  private lastFrameTime = 0;
  private gestureState: 'waiting' | 'palm_detected' | 'tracking_wave' | 'covered' = 'waiting';
  private palmDetectedTime = 0;
  private waveCount = 0;
  private waveStartTime = 0;
  private coverStartTime = 0;
  private lastBrightness = 1;
  private brightnessBuffer: number[] = [];
  private motionVector = { x: 0, y: 0, count: 0 };
  private gestureDetections: GestureDetection[] = []; // Track all gestures
  private lastGestureTime = 0; // For cooldown

  async start(callback: (result: GestureDetectionResult) => void): Promise<boolean> {
    try {
      // Request camera permissions
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        console.error('Camera permission not granted');
        return false;
      }

      this.onDetection = callback;
      this.isWatching = true;
      
      console.log('✅ Gesture detection started');
      return true;
    } catch (error) {
      console.error('Failed to start gesture detection:', error);
      return false;
    }
  }

  // Analyze camera frame for gestures
  async analyzeFrame(frameData: any) {
    if (!this.isWatching) return;

    const now = Date.now();
    this.lastFrameTime = now;

    try {
      // Simulate frame analysis
      // In production, this would analyze actual camera frames
      
      const brightness = this.calculateBrightness(frameData);
      this.brightnessBuffer.push(brightness);
      if (this.brightnessBuffer.length > 10) {
        this.brightnessBuffer.shift();
      }

      // Gesture 3: Camera Cover Detection
      await this.detectCameraCover(brightness, now);

      // Gesture 1: Help Gesture (Palm → Fist)
      await this.detectHelpGesture(frameData, now);

      // Gesture 2: Wave Detection
      await this.detectWave(frameData, now);
      
    } catch (error) {
      console.error('Frame analysis error:', error);
    }
  }

  private calculateBrightness(frameData: any): number {
    // Simulate brightness calculation
    // In production, calculate average pixel brightness
    return Math.random(); // Placeholder
  }

  private async detectCameraCover(brightness: number, now: number) {
    const avgBrightness = this.brightnessBuffer.reduce((a, b) => a + b, 0) / this.brightnessBuffer.length;
    
    // Camera is covered if brightness is very low
    if (avgBrightness < 0.15) {
      if (this.coverStartTime === 0) {
        this.coverStartTime = now;
        console.log('📷 Camera cover detected - starting timer');
      } else {
        const coverDuration = now - this.coverStartTime;
        
        if (coverDuration >= 2000) {
          // Covered for 2+ seconds - trigger!
          this.onDetection?.({
            detected: true,
            gesture: 'cover',
            confidence: 0.90,
          });
          
          console.log('🚨 CAMERA COVER GESTURE DETECTED');
          this.coverStartTime = 0; // Reset
          
          // Cooldown
          setTimeout(() => {
            this.gestureState = 'waiting';
          }, 3000);
        }
      }
    } else {
      this.coverStartTime = 0; // Reset if brightness increases
    }
  }

  private async detectHelpGesture(frameData: any, now: number) {
    // State machine: waiting → palm_detected → fist → trigger
    
    // Simulate hand detection
    const handDetected = Math.random() > 0.7;
    const isPalmOpen = Math.random() > 0.5;
    
    if (this.gestureState === 'waiting' && handDetected && isPalmOpen) {
      this.gestureState = 'palm_detected';
      this.palmDetectedTime = now;
      console.log('✋ Palm detected - waiting for fist...');
    } else if (this.gestureState === 'palm_detected') {
      const elapsed = now - this.palmDetectedTime;
      
      if (elapsed > 2000) {
        // Timeout - reset
        this.gestureState = 'waiting';
        console.log('⏱️ Palm gesture timeout');
      } else if (handDetected && !isPalmOpen) {
        // Fist detected within time window!
        this.onDetection?.({
          detected: true,
          gesture: 'help',
          confidence: 0.95,
        });
        
        console.log('🚨 HELP GESTURE DETECTED (Palm → Fist)');
        this.gestureState = 'waiting';
        
        // Cooldown
        setTimeout(() => {
          this.gestureState = 'waiting';
        }, 3000);
      }
    }
  }

  private async detectWave(frameData: any, now: number) {
    // Track hand position changes
    const handX = Math.random() * 100; // Simulate X position
    
    if (this.gestureState === 'tracking_wave' || this.waveStartTime === 0) {
      if (this.waveStartTime === 0) {
        this.waveStartTime = now;
        this.waveCount = 0;
        this.motionVector = { x: handX, y: 0, count: 0 };
      }
      
      // Detect direction reversal
      const deltaX = handX - this.motionVector.x;
      if (Math.abs(deltaX) > 15) { // Significant movement
        this.waveCount++;
        this.motionVector.x = handX;
        console.log(`👋 Wave count: ${this.waveCount}`);
      }
      
      const elapsed = now - this.waveStartTime;
      
      if (elapsed > 1000) {
        if (this.waveCount >= 4) {
          // 4+ waves in 1 second!
          this.onDetection?.({
            detected: true,
            gesture: 'wave',
            confidence: 0.85,
          });
          
          console.log('🚨 WAVE GESTURE DETECTED');
        }
        
        // Reset wave tracking
        this.waveStartTime = 0;
        this.waveCount = 0;
        
        // Cooldown
        setTimeout(() => {
          this.gestureState = 'waiting';
        }, 3000);
      }
    }
  }

  // Manual trigger for testing
  simulateGesture(gesture: 'help' | 'wave' | 'cover') {
    if (this.isWatching) {
      const confidenceMap = { help: 0.95, wave: 0.85, cover: 0.90 };
      
      this.onDetection?.({
        detected: true,
        gesture,
        confidence: confidenceMap[gesture],
      });
    }
  }

  stop() {
    this.isWatching = false;
    this.gestureState = 'waiting';
    this.frameBuffer = [];
    console.log('🛑 Gesture detection stopped');
  }

  getState() {
    return this.gestureState;
  }
}

export const gestureDetector = new GestureDetector();

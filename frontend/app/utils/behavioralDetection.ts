import { Accelerometer, Gyroscope } from 'expo-sensors';

interface BehavioralDetectionResult {
  detected: boolean;
  pattern: 'jerk' | 'grab' | 'struggle' | null;
  confidence: number;
  anomalyScore: number;
}

interface SensorData {
  x: number;
  y: number;
  z: number;
}

export class BehavioralDetector {
  private isMonitoring = false;
  private onDetection: ((result: BehavioralDetectionResult) => void) | null = null;
  private accelerometerSubscription: any = null;
  private gyroscopeSubscription: any = null;
  private baseline: { accel: SensorData[]; gyro: SensorData[] } = { accel: [], gyro: [] };
  private currentData: { accel: SensorData[]; gyro: SensorData[] } = { accel: [], gyro: [] };
  private isCalibrating = true;
  private calibrationStartTime = 0;
  private readonly CALIBRATION_DURATION = 5000; // 5 seconds
  private readonly JERK_THRESHOLD = 2.5; // G-force
  private readonly STRUGGLE_DURATION = 2000; // ms
  private readonly ANOMALY_THRESHOLD = 0.7;
  private lastAnomalyTime = 0;

  async start(callback: (result: BehavioralDetectionResult) => void): Promise<boolean> {
    try {
      this.onDetection = callback;
      this.isMonitoring = true;
      this.isCalibrating = true;
      this.calibrationStartTime = Date.now();

      // Set update intervals
      Accelerometer.setUpdateInterval(100); // 10Hz
      Gyroscope.setUpdateInterval(100);

      // Subscribe to accelerometer
      this.accelerometerSubscription = Accelerometer.addListener((data) => {
        this.processAccelerometerData(data);
      });

      // Subscribe to gyroscope
      this.gyroscopeSubscription = Gyroscope.addListener((data) => {
        this.processGyroscopeData(data);
      });

      console.log('✅ Behavioral detection started - calibrating...');
      
      // End calibration after duration
      setTimeout(() => {
        this.isCalibrating = false;
        console.log('✅ Calibration complete - monitoring active');
      }, this.CALIBRATION_DURATION);

      return true;
    } catch (error) {
      console.error('Failed to start behavioral detection:', error);
      return false;
    }
  }

  private processAccelerometerData(data: SensorData) {
    if (!this.isMonitoring) return;

    if (this.isCalibrating) {
      // Build baseline during calibration
      this.baseline.accel.push(data);
      if (this.baseline.accel.length > 50) {
        this.baseline.accel.shift();
      }
    } else {
      // Monitor for anomalies
      this.currentData.accel.push(data);
      if (this.currentData.accel.length > 20) {
        this.currentData.accel.shift();
      }

      // Calculate magnitude
      const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
      
      // Detect sudden jerk (high acceleration spike)
      if (magnitude > this.JERK_THRESHOLD) {
        const now = Date.now();
        
        // Prevent rapid-fire detections
        if (now - this.lastAnomalyTime > 3000) {
          this.lastAnomalyTime = now;
          
          this.onDetection?.({
            detected: true,
            pattern: 'jerk',
            confidence: Math.min(0.85, magnitude / 3),
            anomalyScore: magnitude / this.JERK_THRESHOLD,
          });
          
          console.log('🚨 SUDDEN JERK DETECTED:', { magnitude });
        }
      }

      // Detect struggle pattern (sustained chaotic movement)
      this.detectStruggle();
    }
  }

  private processGyroscopeData(data: SensorData) {
    if (!this.isMonitoring) return;

    if (this.isCalibrating) {
      // Build baseline
      this.baseline.gyro.push(data);
      if (this.baseline.gyro.length > 50) {
        this.baseline.gyro.shift();
      }
    } else {
      // Monitor for phone grab (rapid rotation)
      this.currentData.gyro.push(data);
      if (this.currentData.gyro.length > 20) {
        this.currentData.gyro.shift();
      }

      const rotationSpeed = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
      
      if (rotationSpeed > 3.0) {
        const now = Date.now();
        
        if (now - this.lastAnomalyTime > 3000) {
          this.lastAnomalyTime = now;
          
          this.onDetection?.({
            detected: true,
            pattern: 'grab',
            confidence: 0.75,
            anomalyScore: rotationSpeed / 3.0,
          });
          
          console.log('🚨 PHONE GRAB DETECTED:', { rotationSpeed });
        }
      }
    }
  }

  private detectStruggle() {
    if (this.currentData.accel.length < 15) return;

    // Calculate variance in recent accelerometer data
    const recentData = this.currentData.accel.slice(-15);
    const magnitudes = recentData.map(d => Math.sqrt(d.x ** 2 + d.y ** 2 + d.z ** 2));
    
    const mean = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
    const variance = magnitudes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / magnitudes.length;
    const stdDev = Math.sqrt(variance);

    // High variance indicates chaotic movement (struggle)
    if (stdDev > 0.8) {
      const now = Date.now();
      
      if (now - this.lastAnomalyTime > 5000) {
        this.lastAnomalyTime = now;
        
        this.onDetection?.({
          detected: true,
          pattern: 'struggle',
          confidence: 0.70,
          anomalyScore: stdDev / 0.8,
        });
        
        console.log('🚨 STRUGGLE PATTERN DETECTED:', { stdDev });
      }
    }
  }

  // Calculate anomaly score for fusion engine
  getAnomalyScore(): number {
    if (this.isCalibrating || this.currentData.accel.length < 10) {
      return 0;
    }

    // Compare current data to baseline
    const currentMagnitude = this.calculateAverageMagnitude(this.currentData.accel);
    const baselineMagnitude = this.calculateAverageMagnitude(this.baseline.accel);
    
    const deviation = Math.abs(currentMagnitude - baselineMagnitude);
    return Math.min(1.0, deviation / 2.0);
  }

  private calculateAverageMagnitude(data: SensorData[]): number {
    if (data.length === 0) return 0;
    
    const magnitudes = data.map(d => Math.sqrt(d.x ** 2 + d.y ** 2 + d.z ** 2));
    return magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
  }

  stop() {
    this.isMonitoring = false;
    
    if (this.accelerometerSubscription) {
      this.accelerometerSubscription.remove();
      this.accelerometerSubscription = null;
    }
    
    if (this.gyroscopeSubscription) {
      this.gyroscopeSubscription.remove();
      this.gyroscopeSubscription = null;
    }
    
    console.log('🛑 Behavioral detection stopped');
  }
}

export const behavioralDetector = new BehavioralDetector();

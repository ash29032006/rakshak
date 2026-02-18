// Fusion Engine: Combines all detection methods

export interface FusionResult {
  shouldTrigger: boolean;
  finalScore: number;
  detectionType: 'voice' | 'gesture' | 'behavioral' | 'fusion';
  confidence: number;
  breakdown: {
    voice: number;
    gesture: number;
    behavioral: number;
  };
}

export class FusionEngine {
  private readonly VOICE_WEIGHT = 0.40;
  private readonly GESTURE_WEIGHT = 0.30;
  private readonly BEHAVIORAL_WEIGHT = 0.20;
  
  private voiceScore = 0;
  private gestureScore = 0;
  private behavioralScore = 0;
  
  private sensitivityThresholds = {
    low: 0.85,
    medium: 0.75,
    high: 0.65,
  };

  updateVoiceScore(confidence: number) {
    this.voiceScore = confidence;
  }

  updateGestureScore(confidence: number) {
    this.gestureScore = confidence;
  }

  updateBehavioralScore(anomalyLevel: number) {
    this.behavioralScore = anomalyLevel;
  }

  calculate(sensitivity: 'low' | 'medium' | 'high'): FusionResult {
    // Primary detection (voice or gesture)
    const primary = Math.max(this.voiceScore, this.gestureScore);
    
    // Behavioral modifier
    const behavioralModifier = this.behavioralScore * this.BEHAVIORAL_WEIGHT;
    
    // Final fusion score
    let finalScore = primary + behavioralModifier;
    
    // Context adjustments
    finalScore = this.applyContextAdjustments(finalScore);
    
    // Check threshold
    const threshold = this.sensitivityThresholds[sensitivity];
    const shouldTrigger = finalScore >= threshold;
    
    // Determine detection type
    let detectionType: 'voice' | 'gesture' | 'behavioral' | 'fusion' = 'fusion';
    if (this.voiceScore > this.gestureScore && this.voiceScore > 0.5) {
      detectionType = 'voice';
    } else if (this.gestureScore > this.voiceScore && this.gestureScore > 0.5) {
      detectionType = 'gesture';
    } else if (this.behavioralScore > 0.5) {
      detectionType = 'behavioral';
    }
    
    return {
      shouldTrigger,
      finalScore,
      detectionType,
      confidence: finalScore,
      breakdown: {
        voice: this.voiceScore,
        gesture: this.gestureScore,
        behavioral: this.behavioralScore,
      },
    };
  }

  private applyContextAdjustments(score: number): number {
    let adjusted = score;
    
    // Time-based adjustment (night time = higher sensitivity)
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 5) {
      adjusted += 0.10; // Night time bonus
    }
    
    // Cap at 1.0
    return Math.min(1.0, adjusted);
  }

  reset() {
    this.voiceScore = 0;
    this.gestureScore = 0;
    this.behavioralScore = 0;
  }

  getScores() {
    return {
      voice: this.voiceScore,
      gesture: this.gestureScore,
      behavioral: this.behavioralScore,
    };
  }
}

export const fusionEngine = new FusionEngine();

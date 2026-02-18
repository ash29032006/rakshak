import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { voiceDetector } from '../utils/voiceDetection';
import { gestureDetector } from '../utils/gestureDetection';
import { behavioralDetector } from '../utils/behavioralDetection';
import { fusionEngine } from '../utils/fusionEngine';
import { useApp } from '../contexts/AppContext';

export default function DetectionManager() {
  const {
    protectionActive,
    voiceDetectionEnabled,
    gestureDetectionEnabled,
    behavioralDetectionEnabled,
    sensitivity,
    triggerAlert,
    updateDetectionState,
  } = useApp();

  const appState = useRef(AppState.currentState);
  const fusionCheckInterval = useRef<any>(null);
  const gestureFrameInterval = useRef<any>(null);

  useEffect(() => {
    if (protectionActive) {
      startDetection();
    } else {
      stopDetection();
    }

    return () => {
      stopDetection();
    };
  }, [protectionActive, voiceDetectionEnabled, gestureDetectionEnabled, behavioralDetectionEnabled]);

  const startDetection = async () => {
    console.log('🛡️ Starting detection systems...');

    // Start voice detection
    if (voiceDetectionEnabled) {
      const voiceStarted = await voiceDetector.start((result) => {
        if (result.detected) {
          console.log('🎤 Voice detection:', result);
          fusionEngine.updateVoiceScore(result.confidence);
          updateDetectionState({ voiceConfidence: result.confidence });
          checkFusionTrigger();
        }
      });
      
      if (!voiceStarted) {
        console.warn('⚠️ Voice detection failed to start');
      }
    }

    // Start gesture detection
    if (gestureDetectionEnabled) {
      const gestureStarted = await gestureDetector.start((result) => {
        if (result.detected) {
          console.log('👋 Gesture detection:', result);
          fusionEngine.updateGestureScore(result.confidence);
          updateDetectionState({ 
            gestureConfidence: result.confidence,
            gestureState: result.gesture || 'waiting'
          });
          checkFusionTrigger();
        }
      });
      
      if (!gestureStarted) {
        console.warn('⚠️ Gesture detection failed to start');
      }

      // Simulate frame analysis (in production, connect to actual camera)
      gestureFrameInterval.current = setInterval(() => {
        gestureDetector.analyzeFrame(null); // Pass actual frame data in production
      }, 200); // 5 FPS
    }

    // Start behavioral detection
    if (behavioralDetectionEnabled) {
      const behavioralStarted = await behavioralDetector.start((result) => {
        if (result.detected) {
          console.log('📱 Behavioral detection:', result);
          fusionEngine.updateBehavioralScore(result.anomalyScore);
          updateDetectionState({ behavioralConfidence: result.anomalyScore });
          checkFusionTrigger();
        }
      });
      
      if (!behavioralStarted) {
        console.warn('⚠️ Behavioral detection failed to start');
      }
    }

    // Start fusion engine monitoring
    fusionCheckInterval.current = setInterval(() => {
      const result = fusionEngine.calculate(sensitivity);
      const scores = fusionEngine.getScores();
      
      updateDetectionState({
        voiceConfidence: scores.voice,
        gestureConfidence: scores.gesture,
        behavioralConfidence: scores.behavioral,
        fusionScore: result.finalScore,
      });

      // Auto-trigger if threshold exceeded
      if (result.shouldTrigger) {
        console.log('🚨 FUSION TRIGGER:', result);
        triggerAlert(result.detectionType, result.confidence);
        fusionEngine.reset();
      }
    }, 1000); // Check every second
  };

  const stopDetection = () => {
    console.log('🛑 Stopping detection systems...');
    
    voiceDetector.stop();
    gestureDetector.stop();
    behavioralDetector.stop();
    
    if (fusionCheckInterval.current) {
      clearInterval(fusionCheckInterval.current);
      fusionCheckInterval.current = null;
    }
    
    if (gestureFrameInterval.current) {
      clearInterval(gestureFrameInterval.current);
      gestureFrameInterval.current = null;
    }
    
    fusionEngine.reset();
    
    updateDetectionState({
      voiceConfidence: 0,
      gestureConfidence: 0,
      behavioralConfidence: 0,
      fusionScore: 0,
    });
  };

  const checkFusionTrigger = () => {
    const result = fusionEngine.calculate(sensitivity);
    
    if (result.shouldTrigger) {
      console.log('🚨 IMMEDIATE FUSION TRIGGER:', result);
      triggerAlert(result.detectionType, result.confidence);
      fusionEngine.reset();
    }
  };

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground');
        if (protectionActive) {
          startDetection();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        console.log('App has gone to the background');
        // In production, continue monitoring in background
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [protectionActive]);

  return null; // This is a headless component
}

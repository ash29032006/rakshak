import React, { useEffect, useRef } from 'react';
import { AppState, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
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

  // HTML content for MediaPipe Gesture Detection
  const gestureHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gesture Detection</title>
  <style>
    body { margin: 0; background: #000; overflow: hidden; }
    video { width: 1px; height: 1px; object-fit: cover; opacity: 0.001; }
  </style>
  <!-- Load MediaPipe via Script Tag -->
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.js" crossorigin="anonymous" onload="onModelScriptLoad()" onerror="onModelScriptError()"></script>
</head>
<body>
  <video id="webcam" autoplay playsinline muted></video>
  <script>
    const video = document.getElementById('webcam');
    let handLandmarker = undefined;
    let lastVideoTime = -1;
    let results = undefined;
    let isErrorState = false;
    
    // Wave Detection
    const WAVE_HISTORY_SIZE = 20; 
    const waveHistory = [];
    let wavePeakCount = 0;
    let waveDirection = 0; 
    let lastGestureTime = 0;

    // Fist Detection
    let fistStartTime = 0;
    let isFistDetected = false;

    function sendMessage(type, data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));
      }
    }

    function onModelScriptError() {
      sendMessage('error', 'Failed to load MediaPipe script');
      isErrorState = true;
    }

    window.onModelScriptLoad = function() {
      createHandLandmarker();
    }
    
    window.onModelScriptError = function() {
       sendMessage('error', 'Failed to load MediaPipe script');
       isErrorState = true;
    }

    async function createHandLandmarker() {
      if (isErrorState) return;
      try {
        let Vision = window; 
        if (!Vision.FilesetResolver || !Vision.HandLandmarker) {
           throw new Error("MediaPipe classes not found");
        }

        const vision = await Vision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        
        handLandmarker = await Vision.HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        enableCam();
      } catch (e) {
        sendMessage('error', e.message);
      }
    }

    function enableCam() {
      if (!handLandmarker) return;

      const constraints = {
        video: {
          facingMode: "user",
          width: { ideal: 480 },
          height: { ideal: 360 }
        }
      };

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        sendMessage('error', 'getUserMedia not supported');
        return;
      }

      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        video.srcObject = stream;
        video.onloadeddata = () => {
          predictWebcam();
        };
      }).catch(err => {
        sendMessage('error', 'Camera denied: ' + err.message);
      });
    }

    async function predictWebcam() {
      if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        if (handLandmarker) {
           results = handLandmarker.detectForVideo(video, performance.now());
        }
      }
      
      if (results && results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        detectGestures(landmarks);
      } else {
        waveHistory.length = 0;
        isFistDetected = false;
        fistStartTime = 0;
      }

      window.requestAnimationFrame(predictWebcam);
    }

    function detectGestures(landmarks) {
      const now = Date.now();
      const wrist = landmarks[0];
      
      // --- FIST ---
      const tips = [8, 12, 16, 20];
      let curledFingers = 0;
      
      for (const tipIdx of tips) {
        const tip = landmarks[tipIdx];
        const mcp = landmarks[tipIdx - 3];
        const distTipWrist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        const distMcpWrist = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y);
        if (distTipWrist < distMcpWrist * 1.1) { 
          curledFingers++;
        }
      }

      if (curledFingers >= 4) {
         if (!isFistDetected) {
            fistStartTime = now;
            isFistDetected = true;
         } else if (now - fistStartTime > 200) { 
            if (now - lastGestureTime > 1500) {
                sendMessage('gesture', { type: 'help', confidence: 0.98 });
                lastGestureTime = now;
            }
         }
      } else {
         isFistDetected = false;
      }

      // --- WAVE ---
      waveHistory.push({ x: wrist.x, time: now });
      if (waveHistory.length > WAVE_HISTORY_SIZE) waveHistory.shift();

      if (waveHistory.length >= 5) {
        const oldest = waveHistory[0];
        const newest = waveHistory[waveHistory.length - 1];
        const velocity = (newest.x - oldest.x) / (newest.time - oldest.time);
        
        const MOVE_THRESHOLD = 0.0002; 
        
        let newDirection = 0;
        if (velocity > MOVE_THRESHOLD) newDirection = 1; 
        else if (velocity < -MOVE_THRESHOLD) newDirection = -1;
        
        if (newDirection !== 0 && newDirection !== waveDirection) {
           if (waveDirection !== 0) { 
              wavePeakCount++;
              lastGestureTime = now;
           }
           waveDirection = newDirection;
        }
        
        if (now - lastGestureTime > 1000) wavePeakCount = 0;

        if (wavePeakCount >= 3) { 
           sendMessage('gesture', { type: 'wave', confidence: 0.90 });
           lastGestureTime = now;
           wavePeakCount = 0; 
        }
      }
    }
  </script>
</body>
</html>
`;

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
    console.log('🛡️ DetectionManager: Starting systems...');

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
      if (!voiceStarted) console.warn('⚠️ Voice detection failed to start');
    }

    // Start gesture detection (mostly for permissions)
    if (gestureDetectionEnabled) {
      // We start the detector class just to ensure permissions are granted
      const gestureStarted = await gestureDetector.start((result) => {
        // Allow internal logic if any, but main logic is now WebView
        if (result.detected && result.gesture) {
          // Redundant fallback
        }
      });
      if (!gestureStarted) console.warn('⚠️ Gesture permissions failed');
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
      if (!behavioralStarted) console.warn('⚠️ Behavioral detection failed to start');
    }

    // Start fusion engine monitoring
    fusionCheckInterval.current = setInterval(() => {
      // Cast 'fusion' to any to bypass the specific type error for now
      const result = fusionEngine.calculate(sensitivity);
      const scores = fusionEngine.getScores();

      updateDetectionState({
        voiceConfidence: scores.voice,
        gestureConfidence: scores.gesture,
        behavioralConfidence: scores.behavioral,
        fusionScore: result.finalScore,
      });

      if (result.shouldTrigger) {
        console.log('🚨 FUSION TRIGGER:', result);
        triggerAlert(result.detectionType as any, result.confidence);
        fusionEngine.reset();
      }
    }, 1000);
  };

  const stopDetection = () => {
    console.log('🛑 DetectionManager: Stopping systems...');
    voiceDetector.stop();
    gestureDetector.stop();
    behavioralDetector.stop();

    if (fusionCheckInterval.current) {
      clearInterval(fusionCheckInterval.current);
      fusionCheckInterval.current = null;
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
      // Cast result.detectionType to any to bypass the lint error
      triggerAlert(result.detectionType as any, result.confidence);
      fusionEngine.reset();
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'gesture') {
        const { type, confidence } = data.data;
        // console.log(`👋 MediaPipe Gesture: ${type} (${confidence})`);

        fusionEngine.updateGestureScore(confidence);

        // Map 'help'/'wave'/'cover' to state expected by AppContext
        let state: 'fist' | 'waving' | 'covered' | 'waiting' = 'waiting';
        if (type === 'help') state = 'fist';
        else if (type === 'wave') state = 'waving';
        else if (type === 'cover') state = 'covered';

        updateDetectionState({
          gestureConfidence: confidence,
          gestureState: state
        });
        checkFusionTrigger();
      } else if (data.type === 'error') {
        // Suppress errors in production mode unless critical
        // console.warn('WebView Error:', data.data);
      }
    } catch (e) {
      console.error("WebView Message Parse Error", e);
    }
  };

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (protectionActive) startDetection();
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [protectionActive]);

  return (
    <>
      {gestureDetectionEnabled && protectionActive && (
        <View style={{
          width: 1,
          height: 1,
          opacity: 0.01,
          position: 'absolute',
          bottom: 0,
          right: 0,
          overflow: 'hidden',
          zIndex: -1
        }}>
          <WebView
            originWhitelist={['*']}
            source={{ html: gestureHtml, baseUrl: 'https://localhost.localdomain' }}
            style={{ width: 1, height: 1, backgroundColor: 'transparent' }}
            onMessage={handleWebViewMessage}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={false}
            cacheEnabled={false}
            mediaCapturePermissionGrantType="grant"
            userAgent={Platform.OS === 'android' ? "Mozilla/5.0 (Linux; Android 10; Mobile; rv:89.0) Gecko/89.0 Firefox/89.0" : undefined}
          />
        </View>
      )}
    </>
  );
}

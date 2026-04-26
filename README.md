# RAKSHAK - Your Silent Guardian 🛡️

**AI-Powered Women's Safety Application**

RAKSHAK is an intelligent safety application that silently protects women in distress. It uses AI-powered voice, gesture, and behavioral detection to automatically alert emergency contacts without alerting the attacker.

---

## 🎯 Core Innovation: Silent Alert Mode

Traditional safety apps fail because pressing a panic button alerts the attacker (screen lights up, vibrates, makes noise). **RAKSHAK solves this**: when distress is detected, the phone appears completely normal to the attacker, but emergency contacts receive full GPS alerts. The only output is a subtle haptic vibration in Morse code SOS (··· ——— ···) that only the victim can feel.

---

## 📱 Features

### 🔐 Multi-Layer Detection System
- **Voice Detection**: Detects distress keywords ("help me", "help", "bachao") and screams (high pitch + high energy)
- **Gesture Detection**: 3 emergency hand gestures via front camera
  - Help Gesture: ✋ → ✊ (open palm then close into fist within 2 seconds)
  - Rapid Wave: 👋 (4+ rapid waves in 1 second)
  - Camera Cover: 🤚 (cover camera lens for 2 seconds)
- **Behavioral Detection**: Accelerometer/gyroscope analysis for abnormal movement patterns (e.g., phone snatch, sudden fall)

### 🚨 Silent Alert System
When distress is detected, RAKSHAK:
1. **Haptic SOS**: Vibrates in Morse code (··· ——— ···) - only victim feels this
2. **SMS Alerts**: Sends location + details to 3 emergency contacts
3. **Location Sharing**: Real-time GPS tracking every 10 seconds
4. **Audio Recording**: Captures evidence for 10 minutes
5. **Zero Visible Alerts**: Phone screen stays OFF - attacker never knows

### 📊 Dashboard Features
- Live location tracking on map
- SMS delivery status
- Alert timeline with timestamps
- Quick actions (Call Police, Navigate, Resolve Alert)
- Real-time recording status

### ⚙️ Customizable Settings
- 3 sensitivity levels (Low/Medium/High)
- Toggle detection modules individually
- Edit emergency contacts anytime
- Gesture reference guide
- Test alert functionality

---

## 🏗️ Architecture

### Technical Implementation

#### 📱 Frontend (Mobile App)
- **React Native & Expo:** Built for cross-platform performance. We use Expo for rapid iteration and access to native modules (Camera, Sensors, Haptics).
- **Expo Router:** Implements file-based routing to manage complex navigation flows (Onboarding → Home → Dashboard).
- **React Context API:** Manages global application state, ensuring detection modules (Voice, Gesture, Sensor) communicate seamlessly with the UI.
- **AsyncStorage:** Persists user preferences and emergency contacts locally, ensuring the app works **offline** immediately upon launch.

#### 🧠 AI & Detection Systems (The Core)
- **MediaPipe (Computer Vision):**
  - *Usage:* Runs inside a lightweight WebView bridge.
  - *Implementation:* Uses the `HandLandmarker` model to track 21 hand keypoints in real-time. It validates gesture logic like "Palm → Fist" (SOS signal) with temporal coherence checks to prevent false positives.
  
- **Audio Analysis (Voice):**
  - *Usage:* Procceses raw microphone input data.
  - *Implementation:* 
    1. **Scream Detection**: Monitors Root Mean Square (RMS) amplitude. sudden spikes above ambient noise trigger alerts.
    2. **Keyword Spotting**: Uses valid words analysis to detect phrases like "Help" or "Bachao" even in noisy environments.

- **Sensor Fusion (Behavioral):**
  - *Usage:* Accelerometer and Gyroscope.
  - *Implementation:* A custom sliding-window algorithm analyzes 3-axis motion data. Detection of "Phone Snatch" (high-velocity rotation) or "Fall" (sudden impact + stillness) triggers an anomaly score that contributes to the final alert decision.

#### 🔙 Backend & Infrastructure
- **FastAPI (Python):**
  - *Usage:* High-performance asynchronous server.
  - *Implementation:* Handles REST API endpoints for user creation and alert logging. Its async nature ensures it can handle multiple concurrent distress signals without blocking.
  
- **MongoDB (Database):**
  - *Usage:* Flexible NoSQL storage.
  - *Implementation:* Stores unstructured JSON data for alert timelines (GPS coordinates, timestamps, detection types) allowing for detailed incident replay.

#### 📱 Hardware Integration (Native Modules)
- **Haptic Feedback (SOS):**
  - *Tech:* `expo-haptics`
  - *Usage:* Provides silent, tactile feedback to the user without alerting the attacker.
  - *Implementation:* Uses the `Haptics.notificationAsync` method to pulse in a specific Morse Code pattern (`. . . --- . . .`) during critical alerts. This ensures the user *feels* the help confirmation even if the phone is in their pocket.

- **Motion Sensors (Behavioral):**
  - *Tech:* `expo-sensors` (Accelerometer & Gyroscope)
  - *Usage:* Continuous background monitoring of device movement.
  - *Implementation:* Data is sampled at 60Hz. A custom fusion algorithm detects sudden stops (falls) or high-velocity rotational changes (snatch).

- **Camera System (Gesture):**
  - *Tech:* `expo-camera` & `react-native-webview`
  - *Usage:* Captures video frames for gesture analysis.
  - *Implementation:* Frames are piped from the native camera stream into a high-performance WebView running MediaPipe's WASM binary, enabling real-time hand tracking without heavy native ML dependencies.


### File Structure
```
app/
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx                 # Root layout with AppContext
│   │   ├── index.tsx                   # Entry point (checks onboarding)
│   │   ├── onboarding.tsx              # 6-step onboarding flow
│   │   ├── components/
│   │   │   └── DetectionManager.tsx    # Core AI detection logic (Voice/Gesture/Behavior)
│   │   ├── contexts/
│   │   │   └── AppContext.tsx          # Global state management
│   │   └── (tabs)/
│   │       ├── _layout.tsx             # Bottom tab navigation
│   │       ├── index.tsx               # Home screen (protection shield)
│   │       ├── dashboard.tsx           # Alert dashboard
│   │       └── settings.tsx            # Settings & configuration
│   ├── app.json                        # Expo configuration + permissions
│   └── package.json                    # Dependencies
└── backend/
    └── server.py                       # FastAPI server with MongoDB
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and Yarn
- Python 3.9+
- MongoDB
- Expo CLI
- Mobile device or emulator

### Installation

1. **Install Frontend Dependencies**
```bash
cd /app/frontend
yarn install
```

2. **Install Backend Dependencies**
```bash
cd /app/backend
pip install -r requirements.txt
```

3. **Environment Variables**
Frontend `.env`:
```
EXPO_PACKAGER_PROXY_URL=<your-preview-url>
EXPO_PACKAGER_HOSTNAME=<your-hostname>
EXPO_PUBLIC_BACKEND_URL=<backend-url>
```

Backend `.env`:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=rakshak_db
```

4. **Start Services**
```bash
# Start backend
cd /app/backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Start frontend (in another terminal)
cd /app/frontend
expo start --tunnel
```

5. **Access the App**
- Web: Open the preview URL in browser
- Mobile: Scan QR code with Expo Go app

---

## 📖 User Guide

### First Time Setup (Onboarding)

**Step 1: Welcome**
- Learn about RAKSHAK's features
- Understand the silent alert concept

**Step 2: Your Name**
- Enter your name for personalized alerts

**Step 3: Emergency Contacts**
- Add 3 emergency contacts (name + phone)
- First contact = highest priority

**Step 4: Permissions**
- Grant Camera (gesture detection)
- Grant Microphone (voice detection)
- Grant Location (GPS tracking)
- Grant SMS (alert sending)

**Step 5: Learn Gestures**
- Review the 3 emergency gestures
- Practice them mentally

**Step 6: Ready**
- Confirm all setup complete
- Start using RAKSHAK

### Daily Use

**Home Screen:**
1. Tap the shield to toggle protection ON/OFF
2. When ON: All detection modules are active
3. Adjust sensitivity: Low (85%) / Medium (75%) / High (65%)
4. Test the system with "Test Alert" button

**Dashboard:**
- Shows "Monitoring Active" when no alerts
- Displays full alert details when active
- Real-time location tracking on map
- SMS delivery status
- One-tap actions (call police, navigate, resolve)

**Settings:**
- Edit your name and contacts
- Toggle detection modules on/off
- Change sensitivity level
- Enable/disable silent mode
- Review gesture reference
- Test alert system
- Reset all data

---

## 🔒 Permissions Required

### iOS (in app.json)
```json
"NSCameraUsageDescription": "Detect emergency hand gestures for your safety"
"NSMicrophoneUsageDescription": "Detect distress keywords and screams"
"NSLocationWhenInUseUsageDescription": "Share your location in emergencies"
"NSLocationAlwaysUsageDescription": "Track your location during alerts"
```

### Android (in app.json)
```json
"permissions": [
  "CAMERA",
  "RECORD_AUDIO",
  "ACCESS_FINE_LOCATION",
  "ACCESS_COARSE_LOCATION",
  "SEND_SMS",
  "VIBRATE"
]
```

---

## 🧪 Testing

### Manual Testing
1. Complete onboarding flow
2. Toggle protection ON
3. Click "Test Alert" button
4. Verify:
   - Haptic SOS vibration (··· ——— ···)
   - Alert overlay appears
   - 5-second countdown works
   - Cancel button works during countdown
   - Dashboard shows active alert
   - All timeline events appear
5. Navigate to Settings
6. Edit contacts and user info
7. Toggle detection modules
8. Change sensitivity levels

### Backend Testing
Test API endpoints with curl:

```bash
# Health check
curl http://localhost:8001/api/

# Create user
curl -X POST http://localhost:8001/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Priya Sharma",
    "emergency_contacts": [
      {"id": "1", "name": "Mom", "phone": "+919876543210", "relation": "Mother", "priority": 1}
    ]
  }'

# Create alert
curl -X POST http://localhost:8001/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_id_here",
    "detection_type": "manual",
    "confidence": 0.95,
    "location": {"latitude": 12.9716, "longitude": 77.5946, "address": "Koramangala"},
    "timeline": []
  }'
```

---

## 🎨 Design System

### Colors
- Background: `#0F172A` (dark navy)
- Cards: `#1E293B` (dark slate)
- Borders: `#334155` (medium slate)
- Alert Red: `#DC2626`
- Safe Green: `#10B981`
- Info Blue: `#3B82F6`
- Gesture Purple: `#8B5CF6`
- Warning Orange: `#F59E0B`
- Text Primary: `#F1F5F9`
- Text Secondary: `#94A3B8`

### Typography
- App Title: 28px bold
- Section Headers: 20px semibold
- Body Text: 16px regular
- Captions: 13px regular

### Animations
- Shield Pulse: Breathing animation (scale 1→1.05→1, 2s loop)
- Alert Flash: Rapid red pulse (0.5s loop)
- Status Dots: Gentle pulse when active
- Timeline: Fade in + slide up sequentially

---

## 🔐 Security & Privacy

### Data Storage
- User data stored locally in AsyncStorage
- Alerts stored in MongoDB
- No personal data sent to third parties
- All AI detection runs on-device

### Alert Privacy
- Silent mode: No visible indication on phone
- Haptic feedback: Only victim feels SOS vibration
- SMS format includes "DO NOT CALL" warning
- Emergency contacts know victim's phone shows nothing

---

## 🚧 Current Status

### ✅ Implemented
- Complete UI for all 4 screens (Home, Dashboard, Settings, Onboarding)
- Onboarding flow (6 steps)
- State management with Context API
- AsyncStorage persistence
- Permissions handling
- Home screen with protection toggle
- Alert system with haptic SOS
- Dashboard with alert details
- Settings with full customization
- Backend API with MongoDB
- Navigation (bottom tabs + stack)
- **Voice Detection System** (Vosk + Audio Analysis)
- **Gesture Detection System** (MediaPipe Integration)
- **Behavioral Detection System** (Sensor Fusion)
- **Fusion Engine** (Multi-modal Alert Logic)

### 🔨 In Progress (Phase 2)
- Real-time SMS sending (Integration)
- Cloud syncing of alert history
- Background processing optimization

---

## 📊 Detection Thresholds

| Detection Type | Confidence | Threshold |
|---------------|-----------|-----------|
| Keyword (voice) | 95% | "help me", "help", "bachao", "stop" |
| Scream (voice) | 85-90% | >400Hz sustained 500ms |
| Help Gesture | 95% | Palm → Fist within 2s |
| Wave Gesture | 85% | 4+ reversals in 1s |
| Camera Cover | 90% | Dark + no landmarks 2s |

### Sensitivity Levels
- **LOW**: 85% confidence required (fewer false alerts)
- **MEDIUM**: 75% confidence (recommended)
- **HIGH**: 65% confidence (more sensitive)

---

## 🆘 Emergency Use Case

**Scenario**: Woman in danger, attacker nearby

1. RAKSHAK detects distress (voice/gesture/movement)
2. Phone stays completely normal (no light, sound, notification)
3. Victim feels subtle haptic SOS vibration
4. Emergency contacts receive SMS with:
   - Alert type and confidence
   - Live location link
   - Warning: "DO NOT CALL - SILENT MODE"
   - Instruction to send help immediately
5. RAKSHAK continues:
   - Recording audio evidence
   - Updating location every 10s
   - Maintaining silent mode
6. Help arrives without attacker knowing

---

## 🏆 Built For

**VICHAR IDEATHON 2026**
- **Team**: Kavack 
- **Theme**: Safety First - The Silent Guardian
- **Target Users**: Women, especially:
  - Night shift workers
  - College students
  - Elderly women
  - Domestic violence victims
  - Solo travelers

---

## 📝 License

Built By Ashwin Harish

---

## 🙏 Acknowledgments

- Expo Team for the excellent mobile framework
- React Native community
- All the women who inspired this project

---

## 📞 Support

For issues or questions:
1. Check this README
2. Review the app's built-in help sections

**Remember**: RAKSHAK is designed to be your silent guardian. The attacker never knows help is coming. 🛡️

---

**Stay Safe. Stay Protected. Stay Silent.**

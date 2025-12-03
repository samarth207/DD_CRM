# 🔗 Project Connections

## 📂 Project Structure

This DD CRM system consists of **two separate projects**:

### 1. Backend Server (Node.js)
**Location:** `C:\Users\samth\Desktop\DD\CRM`

This is the backend API server that handles:
- User authentication
- Database operations (MongoDB)
- Lead management
- Call record storage
- File uploads (recordings, brochures)

**Start Command:**
```bash
cd C:\Users\samth\Desktop\DD\CRM
npm start
```

### 2. Android Application (Kotlin)
**Location:** `C:\Users\samth\Desktop\DD_CRM_CallTracker_Android`

This is the Android mobile app that provides:
- Automatic call tracking
- Call recording
- User dashboard
- Admin panel
- Cloud sync with backend

**Open in:** Android Studio

---

## 🚀 How to Run Both Projects

### Step 1: Start Backend Server
```bash
# Open Command Prompt or PowerShell
cd C:\Users\samth\Desktop\DD\CRM
npm start
```

✅ Server should be running at `http://localhost:5000`

### Step 2: Open Android App
1. Launch Android Studio
2. Click "Open"
3. Navigate to: `C:\Users\samth\Desktop\DD_CRM_CallTracker_Android`
4. Click "OK"
5. Wait for Gradle sync
6. Click Run ▶️

---

## 🔧 Configuration

### Backend Connection in Android App

The Android app needs to know where your backend server is:

**File:** `DD_CRM_CallTracker_Android/app/src/main/java/com/ddcrm/calltracker/data/api/RetrofitClient.kt`

```kotlin
// For Android Emulator (default):
private const val BASE_URL = "http://10.0.2.2:5000/"

// For Physical Device (use your computer's IP):
private const val BASE_URL = "http://192.168.1.100:5000/"
```

**To find your IP:**
```bash
ipconfig
# Look for IPv4 Address
```

---

## 📡 API Endpoints

The Android app connects to these backend endpoints:

### Authentication
- `POST /api/auth/login`
- `GET /api/auth/me`

### Call Records
- `POST /api/calls`
- `POST /api/calls/batch`
- `GET /api/calls/my-calls`
- `POST /api/calls/:id/recording`
- `GET /api/calls/admin/all` (admin only)
- `GET /api/calls/admin/users-stats` (admin only)

---

## 🔐 Test Accounts

Use these credentials to test:

**Regular User:**
- Email: `user@example.com`
- Password: `password123`

**Admin:**
- Email: `admin@example.com`
- Password: `admin123`

---

## ✅ Quick Verification

### 1. Check Backend is Running
```bash
curl http://localhost:5000/api/health
```
Should return: `{"status":"OK","message":"Server is running"}`

### 2. Test Login API
```bash
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"user@example.com\",\"password\":\"password123\"}"
```

### 3. Test Android App
1. Open app
2. Login with test credentials
3. Check if dashboard loads
4. Make a test call
5. Verify it appears in the app

---

## 🔥 Firewall Configuration (For Physical Devices)

If using a physical Android device, allow backend access:

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "DD CRM Backend" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
```

---

## 📚 Documentation

### Backend Documentation
- `C:\Users\samth\Desktop\DD\CRM\BACKEND_README.md`
- `C:\Users\samth\Desktop\DD\CRM\README.md`

### Android Documentation
- `C:\Users\samth\Desktop\DD_CRM_CallTracker_Android\README.md`
- `C:\Users\samth\Desktop\DD_CRM_CallTracker_Android\QUICKSTART.md`
- `C:\Users\samth\Desktop\DD_CRM_CallTracker_Android\INSTALLATION.md`

---

## 🐛 Troubleshooting

### Android App Can't Connect to Backend

**Problem:** "Network error" or "Cannot connect"

**Solutions:**
1. ✅ Verify backend is running: `http://localhost:5000/api/health`
2. ✅ Check `BASE_URL` in `RetrofitClient.kt`
3. ✅ For physical device: Use computer's IP, not `localhost`
4. ✅ Ensure firewall allows port 5000
5. ✅ Both devices on same Wi-Fi network

### Backend Not Starting

**Problem:** Server won't start

**Solutions:**
1. ✅ Check MongoDB is running
2. ✅ Verify `.env` file exists with correct values
3. ✅ Run `npm install` to install dependencies
4. ✅ Check port 5000 is not in use

### Android Build Errors

**Problem:** Gradle sync or build fails

**Solutions:**
1. ✅ Install Android SDK 34
2. ✅ File > Invalidate Caches > Restart
3. ✅ Update `local.properties` with SDK path
4. ✅ Clean and rebuild: `Build > Clean Project`

---

## 🎯 Development Workflow

### Typical Workflow:
1. ✅ Start MongoDB
2. ✅ Start Backend (`npm start` in CRM folder)
3. ✅ Open Android Studio
4. ✅ Open Android project
5. ✅ Run on emulator or device
6. ✅ Test features
7. ✅ Check backend logs for API calls

### Testing Changes:
- **Backend changes:** Restart server
- **Android changes:** Click Run ▶️ again
- **Backend URL change:** Rebuild Android app

---

## 📦 Project Locations

```
Desktop/
├── DD/
│   └── CRM/                              # Backend Server (Node.js)
│       ├── backend/
│       ├── frontend/
│       ├── package.json
│       ├── BACKEND_README.md
│       └── PROJECT_CONNECTIONS.md        # This file
│
└── DD_CRM_CallTracker_Android/           # Android App (Kotlin)
    ├── app/
    ├── build.gradle
    ├── README.md
    ├── QUICKSTART.md
    └── INSTALLATION.md
```

---

## 💡 Quick Commands

### Backend
```bash
# Start backend
cd C:\Users\samth\Desktop\DD\CRM
npm start

# Test API
curl http://localhost:5000/api/health
```

### Android
```bash
# Build APK
cd C:\Users\samth\Desktop\DD_CRM_CallTracker_Android
.\gradlew assembleDebug

# Install on device
adb install app\build\outputs\apk\debug\app-debug.apk
```

---

**Backend:** `C:\Users\samth\Desktop\DD\CRM`  
**Android:** `C:\Users\samth\Desktop\DD_CRM_CallTracker_Android`  

**Start Backend:** `npm start`  
**Open Android:** Android Studio → Open → Select folder

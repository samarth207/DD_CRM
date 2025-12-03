# DD CRM - Call Tracking System

## 📁 Project Structure

This repository contains the **backend server** for the DD CRM Call Tracking System.

### Backend (This Directory)
- Node.js + Express server
- MongoDB database
- RESTful API for leads, users, and call records
- JWT authentication
- File upload handling

**Location:** `C:\Users\samth\Desktop\DD\CRM`

### Android Application (Separate Project)
The Android mobile application is located in a **separate directory**:

**Location:** `C:\Users\samth\Desktop\DD_CRM_CallTracker_Android`

The Android app provides:
- Automatic call tracking
- Call recording (optional)
- Cloud synchronization
- User dashboard
- Admin management

## 🚀 Quick Start

### Backend Server

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Create `.env` file:
   ```env
   MONGODB_URI=mongodb://localhost:27017/dd_crm
   JWT_SECRET=your_secret_key_here
   PORT=5000
   ```

3. **Start server:**
   ```bash
   npm start
   ```

4. **Verify:**
   Open http://localhost:5000/api/health

### Android App

See the Android project for setup instructions:
```
C:\Users\samth\Desktop\DD_CRM_CallTracker_Android\README.md
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Leads Management
- `POST /api/leads` - Create lead
- `GET /api/leads` - Get leads
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead

### Call Records (NEW)
- `POST /api/calls` - Create call record
- `POST /api/calls/batch` - Batch create calls
- `GET /api/calls/my-calls` - Get user's calls
- `POST /api/calls/:id/recording` - Upload recording
- `GET /api/calls/admin/all` - Get all calls (admin)
- `GET /api/calls/admin/users-stats` - Get user stats (admin)

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/leads` - Get all leads
- Various admin management endpoints

## 🔐 Default Accounts

**Admin:**
- Email: admin@example.com
- Password: admin123

**User:**
- Email: user@example.com
- Password: password123

## 📦 Dependencies

```json
{
  "express": "^4.18.2",
  "mongoose": "^7.6.3",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "multer": "^1.4.5-lts.1",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "compression": "^1.8.1"
}
```

## 🗂️ Backend Structure

```
backend/
├── config/
│   └── db.js              # MongoDB connection
├── middleware/
│   └── auth.js            # JWT authentication
├── models/
│   ├── User.js            # User model
│   ├── Lead.js            # Lead model
│   ├── Brochure.js        # Brochure model
│   └── CallRecord.js      # Call record model (NEW)
├── routes/
│   ├── auth.js            # Auth routes
│   ├── admin.js           # Admin routes
│   ├── leads.js           # Leads routes
│   └── calls.js           # Call tracking routes (NEW)
├── scripts/               # Utility scripts
└── server.js              # Main server file
```

## 🔧 Configuration

### Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 5000)

### CORS
Configured to allow requests from all origins (adjust for production).

### File Uploads
- Brochures stored in: `uploads/`
- Call recordings stored in: `uploads/recordings/`

## 🧪 Testing

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Create Call Record
```bash
curl -X POST http://localhost:5000/api/calls \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "phoneNumber": "1234567890",
    "callType": "outgoing",
    "duration": 120,
    "startTime": "2025-12-03T10:00:00.000Z",
    "endTime": "2025-12-03T10:02:00.000Z"
  }'
```

## 📱 Mobile App Integration

The Android app connects to this backend server for:
1. **Authentication** - User login/logout
2. **Call Sync** - Upload call records
3. **Recording Upload** - Store call recordings
4. **Statistics** - Fetch call analytics
5. **Admin Access** - Manage users and view all calls

**Android App Location:**
```
C:\Users\samth\Desktop\DD_CRM_CallTracker_Android
```

## 🛠️ Development

### Running in Development Mode
```bash
npm run dev
```

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start with nodemon (auto-reload)
- `npm run backfill:assignments` - Backfill assignment history
- `npm run generate:leads` - Generate sample lead data

## 🚨 Important Notes

### For Android App Connection

**Emulator:**
- Use `http://10.0.2.2:5000` (already configured)

**Physical Device:**
1. Find your computer's IP: `ipconfig`
2. Update Android app `RetrofitClient.kt` with your IP
3. Allow port 5000 through Windows Firewall:
   ```powershell
   New-NetFirewallRule -DisplayName "Node.js Server" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
   ```

### Security
- Change `JWT_SECRET` in production
- Configure CORS for specific origins
- Enable HTTPS in production
- Implement rate limiting
- Add input validation

## 📊 Database Schema

### CallRecord Model (NEW)
```javascript
{
  userId: ObjectId,           // Reference to User
  phoneNumber: String,        // Phone number
  callType: String,           // incoming/outgoing/missed
  duration: Number,           // Duration in seconds
  startTime: Date,            // Call start time
  endTime: Date,              // Call end time
  recordingPath: String,      // Local file path
  recordingUrl: String,       // Accessible URL
  notes: String,              // Optional notes
  synced: Boolean,            // Sync status
  createdAt: Date             // Creation timestamp
}
```

## 🔗 Related Projects

- **Android App:** `C:\Users\samth\Desktop\DD_CRM_CallTracker_Android`
- **Frontend:** `frontend/` (Web interface)

## 📝 License

ISC

## 👥 Support

For issues or questions:
1. Check API documentation above
2. Review Android app README
3. Check server logs
4. Verify database connection

---

**Backend Server:** This directory  
**Android App:** `C:\Users\samth\Desktop\DD_CRM_CallTracker_Android`  
**Start Backend:** `npm start`  
**API Health:** http://localhost:5000/api/health

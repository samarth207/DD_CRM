# DD CRM

**Professional Customer Relationship Management System**

DD CRM is a comprehensive, user-friendly customer relationship management solution designed for sales teams and administrators to efficiently manage leads, track progress, and drive conversions.

---

## ✨ Features

### For Administrators
- 📊 **Comprehensive Dashboard** - Real-time overview of all leads and user performance
- 📈 **Advanced Analytics** - Interactive charts showing status distribution and user metrics
- 📤 **Bulk Upload** - Import leads via Excel with intelligent deduplication
- 👥 **User Management** - Create and manage user accounts
- 🔄 **Lead Transfer** - Reassign leads between users with full audit trail
- 📋 **Assignment History** - Complete tracking of all lead assignments and transfers
- 🎯 **Status Tracking** - Click-through status charts to view detailed lead breakdowns

### For Users
- 📋 **Lead Management** - View and manage assigned leads
- 📝 **Notes System** - Add detailed notes to each lead
- 🔄 **Status Updates** - Update lead status with automatic history tracking
- 📊 **Personal Dashboard** - View your lead statistics and progress
- 🔍 **Lead Details** - Access complete lead information and interaction history

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone or navigate to the project directory:**
   ```powershell
   cd "C:\Users\samth\Desktop\DD\CRM"
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Configure environment variables:**
   - Ensure `.env` file exists with:
     ```
     PORT=5000
     MONGODB_URI=mongodb://localhost:27017/ddcrm
     JWT_SECRET=your_jwt_secret_key_change_this_in_production
     NODE_ENV=development
     ```

4. **Start MongoDB:**
   ```powershell
   # Make sure MongoDB service is running
   net start MongoDB
   ```

5. **Seed initial users (first time only):**
   ```powershell
   node backend/seedUsers.js
   ```

6. **Start the server:**
   ```powershell
   npm run dev
   ```

7. **Access the application:**
   - Open browser and navigate to `http://localhost:5000`

---

## 👤 Default Login Credentials

### Admin Account
- **Email:** admin@ddcrm.com
- **Password:** admin123

### User Accounts
- **Email:** user@ddcrm.com | **Password:** user123
- **Email:** sarah@ddcrm.com | **Password:** user123
- **Email:** michael@ddcrm.com | **Password:** user123

---

## 📋 Excel Upload Format

When uploading leads via Excel, use the following column headers:

| Column Name | Required | Description |
|------------|----------|-------------|
| Name | ✓ | Lead's full name |
| Email | ✓ | Email address |
| Phone | ✓ | Contact number |
| Company | ✗ | Company name |
| Status | ✗ | Initial status (defaults to "New") |
| Notes | ✗ | Initial notes |

### Sample Excel Generation
Generate a sample Excel file with proper formatting:
```powershell
node backend/scripts/generateSampleExcel.js
```

---

## 🔧 Available Scripts

```powershell
# Start production server
npm start

# Start development server with auto-reload
npm run dev

# Seed initial admin and user accounts
node backend/seedUsers.js

# Add test users (Sarah and Michael)
node backend/addTestUsers.js

# Generate sample Excel file for testing
node backend/scripts/generateSampleExcel.js

# Backfill assignment history for existing leads
npm run backfill:assignments
```

---

## 🎯 Lead Status Options

- **New** - Freshly added lead
- **Prospect** - Initial contact made
- **Suspect** - Potential interest identified
- **Cold** - Low engagement
- **Warm** - Moderate interest
- **Hot** - High interest, ready to close
- **Closed Won** - Successfully converted
- **Closed Lost** - Opportunity lost

---

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (Admin/User)
- Protected API routes
- Session management

---

## 📊 Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Multer** - File uploads
- **XLSX** - Excel processing

### Frontend
- **HTML5/CSS3** - Structure and styling
- **Vanilla JavaScript** - Client-side logic
- **Chart.js** - Data visualization
- **Responsive Design** - Mobile-friendly interface

---

## 🎨 Professional UI/UX

- Modern gradient design
- Intuitive navigation
- Interactive charts and graphs
- Smooth animations and transitions
- Responsive layout for all devices
- Professional color scheme
- Accessible and user-friendly interface

---

## 📝 Key Workflows

### Admin: Upload & Distribute Leads
1. Navigate to **Upload Leads** section
2. Select one or more users via checkbox dropdown
3. Choose Excel file
4. Upload - leads are distributed equally (round-robin)
5. View distribution summary
6. Duplicates are automatically detected and skipped

### Admin: Track Lead Assignment History
1. Open any lead from user progress table
2. View **Assignment History** section
3. See complete audit trail:
   - Initial assignment
   - All transfers with timestamps
   - Admin who performed each action

### User: Manage Leads
1. View assigned leads on dashboard
2. Click lead to open details
3. Add notes, update status
4. View complete status history
5. All changes are automatically tracked

---

## 🐛 Troubleshooting

### Port 5000 already in use
```powershell
# Stop all Node processes
Get-Process node | Stop-Process -Force

# Or use a different port in .env
PORT=5001
```

### MongoDB connection failed
```powershell
# Check MongoDB status
net start MongoDB

# Or update connection string in .env
MONGODB_URI=mongodb://localhost:27017/ddcrm
```

### Cannot see assignment history
```powershell
# Backfill existing leads
npm run backfill:assignments

# Restart server
Get-Process node | Stop-Process -Force
npm run dev
```

---

## 📞 Support

For issues, questions, or feature requests, please contact your system administrator.

---

## 📄 License

Copyright © 2025 DD CRM. All rights reserved.

---

**Built with ❤️ for efficient lead management**


## Features

### Admin Features
- Admin login with authentication
- Upload Excel sheets with leads for specific users
- View and track user progress on assigned leads
- User management

### User Features
- User login with authentication
- View assigned leads
- Add follow-up notes for each lead
- Update lead status (Prospect, Suspect, Cold, Hot, Closed, etc.)
- Track lead interaction history

## Tech Stack

- **Backend**: Node.js, Express, MongoDB
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Authentication**: JWT (JSON Web Tokens)
- **File Processing**: xlsx library for Excel parsing

## Installation

1. Install dependencies:
```bash
npm run install-all
```

2. Set up MongoDB:
- Install MongoDB locally or use MongoDB Atlas
- Update MONGODB_URI in .env file

3. Start the backend server:
```bash
npm run dev
```

4. Open frontend:
- Open `frontend/index.html` in your browser
- Or use a local server

## Default Login Credentials

### Admin
- Email: admin@telecrm.com
- Password: admin123

### User
- Email: user@telecrm.com
- Password: user123

## Excel Sheet Format

The Excel file should contain the following columns:
- Name
- Email
- Phone
- Company
- Status (optional)
- Notes (optional)

## API Endpoints

### Authentication
- POST /api/auth/login
- POST /api/auth/register

### Admin
- POST /api/admin/upload-leads
- GET /api/admin/users
- GET /api/admin/user-progress/:userId

### User
- GET /api/leads
- PUT /api/leads/:id
- POST /api/leads/:id/notes

## License

ISC

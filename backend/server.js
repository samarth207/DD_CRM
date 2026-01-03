const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Initialize express
const app = express();

// Connect to database
connectDB();

// Security and Performance Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow CDN resources
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.'
});
app.use('/api/auth/login', authLimiter);

// Middleware
app.use(compression({ 
  level: 6, // Balanced compression
  threshold: 1024 // Only compress responses > 1KB
}));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '7d', // Cache for 7 days
  etag: true,
  lastModified: true,
  immutable: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.pdf')) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  }
}));

// Serve static frontend files with aggressive caching
app.use(express.static(path.join(__dirname, '..', 'frontend'), {
  maxAge: '1d', // Cache for 1 day
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Cache JS and CSS files more aggressively
    if (path.endsWith('.js') || path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    }
    // Cache images for longer
    if (path.match(/\.(jpg|jpeg|png|gif|svg|ico|webp)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
    }
  }
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/calls', require('./routes/calls'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Serve frontend HTML files for any non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

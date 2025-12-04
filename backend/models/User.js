const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance optimization
userSchema.index({ email: 1 }, { unique: true }); // Unique index for email lookups
userSchema.index({ role: 1 }); // For filtering users by role

module.exports = mongoose.model('User', userSchema);

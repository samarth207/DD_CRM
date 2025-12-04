const mongoose = require('mongoose');

const callRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  callType: {
    type: String,
    enum: ['incoming', 'outgoing', 'missed'],
    required: true
  },
  duration: {
    type: Number, // Duration in seconds
    default: 0
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  recordingPath: {
    type: String, // Path to the recording file
    default: null
  },
  recordingUrl: {
    type: String, // Full URL to access recording
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  synced: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Indexes for performance
callRecordSchema.index({ userId: 1, createdAt: -1 }); // For user's call history
callRecordSchema.index({ createdAt: -1 }); // For admin to fetch recent calls
callRecordSchema.index({ phoneNumber: 1 }); // For searching by phone number

module.exports = mongoose.model('CallRecord', callRecordSchema);

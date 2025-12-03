const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  contact: { type: String },
  email: { type: String },
  city: { type: String },
  university: { type: String },
  course: { type: String },
  profession: { type: String },
  source: {
    type: String,
    enum: ['Meta', 'Google', 'LinkedIn', 'Instagram', 'Facebook', 'Direct', 'Referral', 'Website', 'Other'],
    default: 'Other'
  },
  status: {
    type: String,
    enum: [
      'Fresh',
      'Buffer fresh',
      'Did not pick',
      'Request call back',
      'Follow up',
      'Counselled',
      'Interested in next batch',
      'Registration fees paid',
      'Enrolled',
      'Junk/not interested'
    ],
    default: 'Fresh'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: [{
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  statusHistory: [{
    status: String,
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  assignmentHistory: [{
    action: { type: String, enum: ['assigned', 'transferred'], required: true },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null for initial assignment
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // admin performing the action
  }],
  lastContactDate: {
    type: Date
  },
  nextCallDateTime: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

leadSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for performance optimization
leadSchema.index({ assignedTo: 1, status: 1 }); // Compound index for user's leads filtered by status
leadSchema.index({ assignedTo: 1, updatedAt: -1 }); // For sorting user's leads by update time
leadSchema.index({ email: 1 }, { sparse: true }); // For duplicate checking and lookups
leadSchema.index({ contact: 1 }, { sparse: true }); // For duplicate checking and lookups
leadSchema.index({ status: 1 }); // For status-based aggregations
leadSchema.index({ university: 1, course: 1 }); // For filtering by university and course
leadSchema.index({ nextCallDateTime: 1 }, { sparse: true }); // For upcoming call reminders

module.exports = mongoose.model('Lead', leadSchema);

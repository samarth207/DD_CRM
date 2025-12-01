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

module.exports = mongoose.model('Lead', leadSchema);

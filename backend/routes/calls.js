const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CallRecord = require('../models/CallRecord');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

// Create recordings directory if it doesn't exist
const recordingsDir = path.join(__dirname, '..', '..', 'uploads', 'recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

// Configure multer for recording uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, recordingsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `recording-${req.userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Accept audio files
    const allowedTypes = /mp3|m4a|3gp|amr|wav|aac/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('audio/');
    
    if (extname || mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'));
    }
  }
});

// @route   POST /api/calls
// @desc    Create a new call record
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { phoneNumber, callType, duration, startTime, endTime, notes } = req.body;

    const callRecord = new CallRecord({
      userId: req.userId,
      phoneNumber,
      callType,
      duration: duration || 0,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      notes: notes || '',
      synced: true
    });

    await callRecord.save();

    res.status(201).json({
      success: true,
      message: 'Call record created successfully',
      callRecord
    });
  } catch (error) {
    console.error('Error creating call record:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating call record',
      error: error.message
    });
  }
});

// @route   POST /api/calls/:callId/recording
// @desc    Upload recording for a call
// @access  Private
router.post('/:callId/recording', auth, upload.single('recording'), async (req, res) => {
  try {
    const callRecord = await CallRecord.findOne({
      _id: req.params.callId,
      userId: req.userId
    });

    if (!callRecord) {
      // Delete uploaded file if call not found
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Call record not found'
      });
    }

    // Delete old recording if exists
    if (callRecord.recordingPath) {
      const oldPath = path.join(__dirname, '..', '..', callRecord.recordingPath);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Update call record with new recording
    const recordingPath = `uploads/recordings/${req.file.filename}`;
    const recordingUrl = `${req.protocol}://${req.get('host')}/${recordingPath}`;

    callRecord.recordingPath = recordingPath;
    callRecord.recordingUrl = recordingUrl;
    await callRecord.save();

    res.json({
      success: true,
      message: 'Recording uploaded successfully',
      recordingUrl,
      callRecord
    });
  } catch (error) {
    console.error('Error uploading recording:', error);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Server error uploading recording',
      error: error.message
    });
  }
});

// @route   POST /api/calls/batch
// @desc    Create multiple call records at once (bulk upload)
// @access  Private
router.post('/batch', auth, async (req, res) => {
  try {
    const { calls } = req.body;

    if (!Array.isArray(calls) || calls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Calls array is required'
      });
    }

    // Add userId to each call and parse dates
    const callRecords = calls.map(call => ({
      userId: req.userId,
      phoneNumber: call.phoneNumber,
      callType: call.callType,
      duration: call.duration || 0,
      startTime: new Date(call.startTime),
      endTime: call.endTime ? new Date(call.endTime) : null,
      notes: call.notes || '',
      synced: true
    }));

    const savedRecords = await CallRecord.insertMany(callRecords);

    res.status(201).json({
      success: true,
      message: `${savedRecords.length} call records created successfully`,
      count: savedRecords.length,
      callRecords: savedRecords
    });
  } catch (error) {
    console.error('Error creating batch call records:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating call records',
      error: error.message
    });
  }
});

// @route   GET /api/calls/my-calls
// @desc    Get current user's call records
// @access  Private
router.get('/my-calls', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = { userId: req.userId };

    // Optional filters
    if (req.query.callType) {
      filter.callType = req.query.callType;
    }
    if (req.query.phoneNumber) {
      filter.phoneNumber = { $regex: req.query.phoneNumber, $options: 'i' };
    }
    if (req.query.startDate && req.query.endDate) {
      filter.startTime = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const callRecords = await CallRecord.find(filter)
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await CallRecord.countDocuments(filter);

    // Calculate statistics
    const stats = await CallRecord.aggregate([
      { $match: { userId: req.userId } },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          incomingCalls: {
            $sum: { $cond: [{ $eq: ['$callType', 'incoming'] }, 1, 0] }
          },
          outgoingCalls: {
            $sum: { $cond: [{ $eq: ['$callType', 'outgoing'] }, 1, 0] }
          },
          missedCalls: {
            $sum: { $cond: [{ $eq: ['$callType', 'missed'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      callRecords,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        recordsPerPage: limit
      },
      stats: stats.length > 0 ? stats[0] : {
        totalCalls: 0,
        totalDuration: 0,
        incomingCalls: 0,
        outgoingCalls: 0,
        missedCalls: 0
      }
    });
  } catch (error) {
    console.error('Error fetching call records:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching call records',
      error: error.message
    });
  }
});

// @route   GET /api/calls/admin/all
// @desc    Get all call records (Admin only)
// @access  Private (Admin)
router.get('/admin/all', auth, adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = {};

    // Optional filters
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }
    if (req.query.callType) {
      filter.callType = req.query.callType;
    }
    if (req.query.phoneNumber) {
      filter.phoneNumber = { $regex: req.query.phoneNumber, $options: 'i' };
    }
    if (req.query.startDate && req.query.endDate) {
      filter.startTime = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const callRecords = await CallRecord.find(filter)
      .populate('userId', 'name email')
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await CallRecord.countDocuments(filter);

    res.json({
      success: true,
      callRecords,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        recordsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error fetching all call records:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching call records',
      error: error.message
    });
  }
});

// @route   GET /api/calls/admin/users-stats
// @desc    Get call statistics for all users (Admin only)
// @access  Private (Admin)
router.get('/admin/users-stats', auth, adminAuth, async (req, res) => {
  try {
    const stats = await CallRecord.aggregate([
      {
        $group: {
          _id: '$userId',
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          incomingCalls: {
            $sum: { $cond: [{ $eq: ['$callType', 'incoming'] }, 1, 0] }
          },
          outgoingCalls: {
            $sum: { $cond: [{ $eq: ['$callType', 'outgoing'] }, 1, 0] }
          },
          missedCalls: {
            $sum: { $cond: [{ $eq: ['$callType', 'missed'] }, 1, 0] }
          },
          recordingsCount: {
            $sum: { $cond: [{ $ne: ['$recordingPath', null] }, 1, 0] }
          },
          lastCallTime: { $max: '$startTime' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userId: '$_id',
          userName: '$user.name',
          userEmail: '$user.email',
          totalCalls: 1,
          totalDuration: 1,
          incomingCalls: 1,
          outgoingCalls: 1,
          missedCalls: 1,
          recordingsCount: 1,
          lastCallTime: 1
        }
      },
      {
        $sort: { totalCalls: -1 }
      }
    ]);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching statistics',
      error: error.message
    });
  }
});

// @route   DELETE /api/calls/:callId
// @desc    Delete a call record
// @access  Private
router.delete('/:callId', auth, async (req, res) => {
  try {
    const callRecord = await CallRecord.findOne({
      _id: req.params.callId,
      userId: req.userId
    });

    if (!callRecord) {
      return res.status(404).json({
        success: false,
        message: 'Call record not found'
      });
    }

    // Delete recording file if exists
    if (callRecord.recordingPath) {
      const recordingPath = path.join(__dirname, '..', '..', callRecord.recordingPath);
      if (fs.existsSync(recordingPath)) {
        fs.unlinkSync(recordingPath);
      }
    }

    await CallRecord.deleteOne({ _id: req.params.callId });

    res.json({
      success: true,
      message: 'Call record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting call record:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting call record',
      error: error.message
    });
  }
});

module.exports = router;

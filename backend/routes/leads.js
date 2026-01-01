const express = require('express');
const Lead = require('../models/Lead');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all leads for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100; // Default 100 leads per page
    const skip = (page - 1) * limit;
    
    const statusFilter = req.query.status;
    const searchQuery = req.query.search;
    
    // Build query
    const query = { assignedTo: req.userId };
    if (statusFilter) {
      query.status = statusFilter;
    }
    if (searchQuery) {
      const searchRegex = new RegExp(searchQuery, 'i');
      query.$or = [
        { name: searchRegex },
        { contact: searchRegex },
        { email: searchRegex },
        { city: searchRegex },
        { university: searchRegex },
        { course: searchRegex },
        { profession: searchRegex }
      ];
    }
    
    // Execute query with pagination
    const [leads, totalCount] = await Promise.all([
      Lead.find(query)
        .select('-__v')
        .populate('assignmentHistory.fromUser', 'name email')
        .populate('assignmentHistory.toUser', 'name email')
        .populate('assignmentHistory.changedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(query)
    ]);
    
    res.json({
      leads,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasMore: skip + leads.length < totalCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check for updates - returns last update timestamp for user's leads
// NOTE: This must be BEFORE /:id route to avoid matching "check-updates" as an ID
router.get('/check-updates', auth, async (req, res) => {
  try {
    const lastCheck = req.query.lastCheck ? new Date(parseInt(req.query.lastCheck)) : new Date(0);
    const lastCount = parseInt(req.query.lastCount) || 0;
    
    // Get current total count
    const currentCount = await Lead.countDocuments({
      assignedTo: req.userId
    });
    
    // Only check for leads updated by OTHERS (admin), not by the user themselves
    // This prevents self-triggering notifications when user edits their own leads
    const updatedOrNewLeads = await Lead.countDocuments({
      assignedTo: req.userId,
      $and: [
        {
          $or: [
            { updatedAt: { $gt: lastCheck } },
            { createdAt: { $gt: lastCheck } }
          ]
        },
        {
          $or: [
            { lastUpdatedBy: { $ne: req.userId } }, // Updated by someone else
            { lastUpdatedBy: { $exists: false } } // New lead without update history
          ]
        }
      ]
    });
    
    // Detect changes: count changed (deletion/addition) OR leads were updated by others
    const countChanged = lastCount > 0 && currentCount !== lastCount;
    const hasUpdates = countChanged || updatedOrNewLeads > 0;
    
    // Get the most recent timestamp (either update or creation)
    const latestLead = await Lead.findOne({
      assignedTo: req.userId
    })
    .sort({ updatedAt: -1 })
    .select('updatedAt')
    .lean();
    
    res.json({
      hasUpdates,
      updateCount: updatedOrNewLeads,
      currentCount,
      countChanged,
      latestTimestamp: latestLead ? latestLead.updatedAt.getTime() : Date.now()
    });
  } catch (error) {
    console.error('Error in check-updates:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single lead
router.get('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({ 
      _id: req.params.id, 
      assignedTo: req.userId 
    }).select('-__v');
    
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update lead (placeholder - status removed)
router.put('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({ 
      _id: req.params.id, 
      assignedTo: req.userId 
    });
    
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    const { status, nextCallDateTime, note } = req.body;
    
    // Update status if provided
    if (status && status !== lead.status) {
      lead.statusHistory = lead.statusHistory || [];
      lead.statusHistory.push({
        status,
        changedAt: new Date(),
        changedBy: req.userId
      });
      lead.status = status;
    }
    
    // Add note if provided
    if (note && note.trim()) {
      lead.notes.push({
        content: note.trim(),
        createdBy: req.userId,
        createdAt: new Date()
      });
    }
    
    // Update next call date/time if provided (can be null to clear)
    if (nextCallDateTime !== undefined) {
      lead.nextCallDateTime = nextCallDateTime ? new Date(nextCallDateTime) : null;
    }
    
    lead.lastContactDate = new Date();
    lead.lastUpdatedBy = req.userId; // Track who made this update
    await lead.save();
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update specific lead field (university, course)
router.put('/:id/field', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({ 
      _id: req.params.id, 
      assignedTo: req.userId 
    });
    
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    const { university, course } = req.body;
    
    if (university !== undefined) {
      lead.university = university;
    }
    
    if (course !== undefined) {
      lead.course = course;
    }
    
    lead.lastUpdatedBy = req.userId; // Track who made this update
    await lead.save();
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add note to lead
router.post('/:id/notes', auth, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: 'Note content is required' });
    }
    
    const lead = await Lead.findOne({ 
      _id: req.params.id, 
      assignedTo: req.userId 
    });
    
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    lead.notes.push({
      content,
      createdBy: req.userId,
      createdAt: new Date()
    });
    
    lead.lastContactDate = new Date();
    lead.lastUpdatedBy = req.userId; // Track who made this update
    await lead.save();
    
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete note from lead
router.delete('/:id/notes/:noteId', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({ 
      _id: req.params.id, 
      assignedTo: req.userId 
    });
    
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    lead.notes = lead.notes.filter(note => note._id.toString() !== req.params.noteId);
    await lead.save();
    
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add new lead (by user)
router.post('/add', auth, async (req, res) => {
  try {
    const { name, contact, email, city, profession, university, course, source, status, initialNote } = req.body;
    
    // Validate required fields
    if (!name || !contact) {
      return res.status(400).json({ message: 'Name and contact are required' });
    }
    
    // Check if lead with same contact already exists for this user
    const existingLead = await Lead.findOne({ 
      contact, 
      assignedTo: req.userId 
    });
    
    if (existingLead) {
      return res.status(400).json({ message: 'A lead with this contact number already exists in your list' });
    }
    
    // Create new lead
    const now = new Date();
    const lead = new Lead({
      name,
      contact,
      email,
      city,
      profession,
      university,
      course,
      source: source || 'Other',
      status: status || 'Fresh',
      assignedTo: req.userId,
      createdAt: now,
      updatedAt: now,
      lastUpdatedBy: req.userId,
      statusHistory: [{
        status: status || 'Fresh',
        changedBy: req.userId,
        changedAt: now
      }],
      assignmentHistory: [{
        action: 'assigned',
        fromUser: null,
        toUser: req.userId,
        changedBy: req.userId,
        changedAt: now
      }]
    });
    
    // Add initial note if provided
    if (initialNote) {
      lead.notes.push({
        content: initialNote,
        createdBy: req.userId,
        createdAt: new Date()
      });
    }
    
    await lead.save();
    
    // Populate the lead data before sending response
    await lead.populate('assignedTo', 'name email');
    await lead.populate('assignmentHistory.fromUser', 'name email');
    await lead.populate('assignmentHistory.toUser', 'name email');
    await lead.populate('assignmentHistory.changedBy', 'name email');
    
    res.status(201).json(lead);
  } catch (error) {
    console.error('Error adding lead:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;



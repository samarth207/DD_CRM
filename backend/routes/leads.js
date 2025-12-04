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

module.exports = router;

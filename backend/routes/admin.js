const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// Upload leads from Excel
router.post('/upload-leads', auth, adminAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let { userIds, dedupeMode } = req.body;
    dedupeMode = dedupeMode || 'skip'; // future expansion: 'reassign'

    if (!userIds) {
      return res.status(400).json({ message: 'User ID(s) required' });
    }

    if (typeof userIds === 'string') {
      try {
        userIds = JSON.parse(userIds);
      } catch (e) {
        userIds = [userIds];
      }
    }
    if (!Array.isArray(userIds)) {
      userIds = [userIds];
    }
    if (userIds.length === 0) {
      return res.status(400).json({ message: 'At least one user must be selected' });
    }

    const users = await User.find({ _id: { $in: userIds }, role: 'user' });
    if (users.length !== userIds.length) {
      return res.status(404).json({ message: 'One or more users not found' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    // Preload existing leads keyed by normalized email or contact
    const allExistingLeads = await Lead.find({}, 'email contact');
    const existingMap = new Map();
    allExistingLeads.forEach(l => {
      const keyEmail = l.email ? l.email.trim().toLowerCase() : null;
      const keyContact = l.contact ? String(l.contact).replace(/\D/g, '') : null;
      if (keyEmail) existingMap.set(`E:${keyEmail}`, true);
      if (keyContact) existingMap.set(`C:${keyContact}`, true);
    });

    const newLeads = [];
    const duplicates = [];

    data.forEach((row, index) => {
      const rawEmail = row.Email || row.email || '';
      const rawContact = row.Contact || row.contact || '';
      const normEmail = rawEmail.trim().toLowerCase();
      const normContact = typeof rawContact === 'string' ? rawContact.replace(/\D/g, '') : String(rawContact || '').replace(/\D/g, '');

      const emailKey = normEmail ? `E:${normEmail}` : null;
      const contactKey = normContact ? `C:${normContact}` : null;

      let isDuplicate = false;
      if (emailKey && existingMap.has(emailKey)) isDuplicate = true;
      else if (contactKey && existingMap.has(contactKey)) isDuplicate = true;

      if (isDuplicate) {
        duplicates.push({ email: normEmail || null, contact: normContact || null });
        return; // skip adding duplicate
      }

      // Mark these identifiers so subsequent rows in same upload are also treated as duplicates
      if (emailKey) existingMap.set(emailKey, true);
      if (contactKey) existingMap.set(contactKey, true);

      const assignedUserId = userIds[index % userIds.length];

      newLeads.push(new Lead({
        name: row.Name || row.name || 'Unknown',
        contact: rawContact,
        email: rawEmail,
        city: row.City || row.city || '',
        university: row.University || row.university || '',
        course: row.Course || row.course || '',
        profession: row.Profession || row.profession || row.Profassion || row.profassion || '',
        status: row.Status || row.status || 'Fresh',
        assignedTo: assignedUserId,
        notes: (row.Notes || row.notes) ? [{
          content: row.Notes || row.notes,
          createdBy: req.userId
        }] : [],
        statusHistory: [{
          status: row.Status || row.status || 'Fresh',
          changedBy: req.userId,
          changedAt: new Date()
        }],
        assignmentHistory: [{
          action: 'assigned',
          fromUser: null,
          toUser: assignedUserId,
          changedBy: req.userId,
          changedAt: new Date()
        }]
      }));
    });

    if (newLeads.length) {
      await Lead.insertMany(newLeads);
    }

    // Distribution summary
    const distribution = {};
    newLeads.forEach(lead => {
      const user = users.find(u => u._id.toString() === lead.assignedTo.toString());
      if (user) distribution[user.name] = (distribution[user.name] || 0) + 1;
    });
    const distributionText = Object.entries(distribution)
      .map(([name, count]) => `${name}: ${count} leads`)
      .join(', ');

    res.json({
      message: `Upload complete. ${newLeads.length} new leads added. ${duplicates.length} duplicates skipped.`,
      addedCount: newLeads.length,
      skippedDuplicates: duplicates.length,
      duplicateSamples: duplicates.slice(0, 10),
      distribution,
      distributionText
    });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading leads', error: error.message });
  }
});

// Get all users (for admin)
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new user
router.post('/create-user', auth, adminAuth, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'user'
    });

    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user progress
router.get('/user-progress/:userId', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const leads = await Lead.find({ assignedTo: userId });

    const statusCounts = {};
    leads.forEach(lead => {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    });

    const user = await User.findById(userId).select('-password');

    res.json({
      user,
      totalLeads: leads.length,
      statusBreakdown: statusCounts,
      leads: leads.map(lead => ({
        id: lead._id,
        name: lead.name,
        contact: lead.contact,
        email: lead.email,
        city: lead.city,
        university: lead.university,
        course: lead.course,
        profession: lead.profession,
        status: lead.status,
        notesCount: lead.notes.length,
        recentNote: lead.notes.length ? lead.notes[lead.notes.length - 1].content : null,
        statusChanges: lead.statusHistory.length,
        lastStatusChange: lead.statusHistory.length ? lead.statusHistory[lead.statusHistory.length - 1].changedAt : null,
        lastContactDate: lead.lastContactDate,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all leads with statistics
router.get('/all-leads', auth, adminAuth, async (req, res) => {
  try {
    const leads = await Lead.find().populate('assignedTo', 'name email');
    
    const stats = {
      total: leads.length,
      byStatus: {},
      byUser: {}
    };

    leads.forEach(lead => {
      // Count by status
      stats.byStatus[lead.status] = (stats.byStatus[lead.status] || 0) + 1;
      
      // Count by user (guard against missing assignment)
      const userName = lead.assignedTo && lead.assignedTo.name ? lead.assignedTo.name : 'Unassigned';
      stats.byUser[userName] = (stats.byUser[userName] || 0) + 1;
    });

    res.json({ leads, stats });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get overall statistics (all users combined)
router.get('/overall-stats', auth, adminAuth, async (req, res) => {
  try {
    const leads = await Lead.find().populate('assignedTo', 'name email');
    const users = await User.find({ role: 'user' }).select('-password');
    
    const statusBreakdown = {};
    const userStats = [];

    // Calculate status breakdown
    leads.forEach(lead => {
      statusBreakdown[lead.status] = (statusBreakdown[lead.status] || 0) + 1;
    });

    // Calculate per-user stats
    users.forEach(user => {
      const userLeads = leads.filter(lead => lead.assignedTo && lead.assignedTo._id && lead.assignedTo._id.toString() === user._id.toString());
      const userStatusBreakdown = {};
      
      userLeads.forEach(lead => {
        userStatusBreakdown[lead.status] = (userStatusBreakdown[lead.status] || 0) + 1;
      });

      userStats.push({
        userId: user._id,
        userName: user.name,
        totalLeads: userLeads.length,
        statusBreakdown: userStatusBreakdown
      });
    });

    res.json({
      totalLeads: leads.length,
      totalUsers: users.length,
      statusBreakdown,
      userStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single lead with notes and status history
router.get('/lead/:id', auth, adminAuth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('assignedTo', 'name email').populate('assignmentHistory.fromUser', 'name email').populate('assignmentHistory.toUser', 'name email').populate('assignmentHistory.changedBy', 'name email');
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.json({
      id: lead._id,
      name: lead.name,
      contact: lead.contact,
      email: lead.email,
      city: lead.city,
      university: lead.university,
      course: lead.course,
      profession: lead.profession,
      status: lead.status,
      notes: lead.notes,
      statusHistory: lead.statusHistory,
      assignmentHistory: lead.assignmentHistory,
      assignedTo: lead.assignedTo,
      lastContactDate: lead.lastContactDate,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Transfer lead to another user
router.patch('/transfer-lead/:leadId', auth, adminAuth, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { newUserId } = req.body;

    if (!newUserId) {
      return res.status(400).json({ message: 'newUserId is required' });
    }

    const newUser = await User.findById(newUserId);
    if (!newUser || newUser.role !== 'user') {
      return res.status(404).json({ message: 'Target user not found or invalid role' });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Update assignment
    const previousUser = lead.assignedTo;
    lead.assignedTo = newUserId;
    // Preserve status in statusHistory for audit trail
    lead.statusHistory.push({
      status: lead.status,
      changedBy: req.userId,
      changedAt: new Date()
    });
    // Log assignment change
    lead.assignmentHistory = lead.assignmentHistory || [];
    lead.assignmentHistory.push({
      action: 'transferred',
      fromUser: previousUser,
      toUser: newUserId,
      changedBy: req.userId,
      changedAt: new Date()
    });
    await lead.save();

    res.json({ message: 'Lead transferred successfully', leadId: lead._id, newAssignedTo: newUserId });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
// Delete a lead
router.delete('/lead/:leadId', auth, adminAuth, async (req, res) => {
  try {
    const { leadId } = req.params;
    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    await Lead.deleteOne({ _id: leadId });
    return res.json({ message: 'Lead deleted successfully', leadId });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get user details (without password) plus lead count
router.get('/user/:userId/details', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const leadCount = await Lead.countDocuments({ assignedTo: userId });
    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      leadCount
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete user (only if no leads assigned)
router.delete('/user/:userId', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role !== 'user') return res.status(400).json({ message: 'Cannot delete admin account' });
    const leadCount = await Lead.countDocuments({ assignedTo: userId });
    if (leadCount > 0) {
      return res.status(400).json({ message: `User has ${leadCount} assigned leads. Transfer or delete leads before deleting user.` });
    }
    await User.deleteOne({ _id: userId });
    return res.json({ message: 'User deleted successfully', userId });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// Reset a user's password (admin only)
router.post('/user/:userId/reset-password', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ message: 'newPassword is required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role !== 'user') {
      return res.status(400).json({ message: 'Cannot reset password for admin via this endpoint' });
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    return res.json({ message: 'Password reset successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Reset admin's own password
router.post('/reset-my-password', auth, adminAuth, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ message: 'newPassword is required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    return res.json({ message: 'Admin password reset successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// Search leads (global admin search)
router.get('/search-leads', auth, adminAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.json({ results: [], total: 0 });
    }
    // Build case-insensitive regex, escape special chars
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(escaped, 'i');
    const query = {
      $or: [
        { name: rx },
        { contact: rx },
        { email: rx },
        { city: rx },
        { university: rx },
        { course: rx },
        { profession: rx },
        { status: rx }
      ]
    };
    const leads = await Lead.find(query)
      .limit(100)
      .sort({ updatedAt: -1 })
      .populate('assignedTo', 'name email');
    const results = leads.map(l => ({
      id: l._id,
      name: l.name,
      contact: l.contact,
      email: l.email,
      city: l.city,
      university: l.university,
      course: l.course,
      profession: l.profession,
      status: l.status,
      assignedTo: l.assignedTo ? { id: l.assignedTo._id, name: l.assignedTo.name, email: l.assignedTo.email } : null,
      updatedAt: l.updatedAt,
      notesCount: l.notes.length
    }));
    res.json({ results, total: results.length });
  } catch (err) {
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
});

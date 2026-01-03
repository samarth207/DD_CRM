const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const archiver = require('archiver');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Brochure = require('../models/Brochure');
const { auth, adminAuth } = require('../middleware/auth');
const { mapExcelRowToLead, getMappingSummary } = require('../utils/excelFieldMapper');
const adminCache = require('../utils/cache');

const router = express.Router();

// Simple in-memory cache for brochures
let brochuresCache = null;
let brochuresCacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function invalidateBrochuresCache() {
  brochuresCache = null;
  brochuresCacheTime = null;
  adminCache.invalidate('brochures');
}

// Configure multer for file upload
const path = require('path');
const fs = require('fs');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Multer for Excel (leads) and PDF (brochure)
const excelUpload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for Excel files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

const pdfUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for PDF files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Upload brochure PDF for university & course
router.post('/upload-brochure', auth, adminAuth, pdfUpload.single('file'), async (req, res) => {
  try {
    const { university, course } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    if (!university || !course) {
      return res.status(400).json({ message: 'University and course required' });
    }
    // Check for existing brochure
    const existing = await Brochure.findOne({ university, course });
    if (existing) {
      return res.status(400).json({ message: 'Brochure already exists for this university and course' });
    }
    
    // Rename file with university and course name
    const sanitizedUniv = university.replace(/[^a-z0-9]/gi, '_');
    const sanitizedCourse = course.replace(/[^a-z0-9]/gi, '_');
    const newFileName = `${sanitizedUniv}-${sanitizedCourse}-brochure.pdf`;
    const oldPath = req.file.path;
    const newPath = path.join(path.dirname(oldPath), newFileName);
    fs.renameSync(oldPath, newPath);
    
    // Store relative path from uploads directory
    const relativePath = `uploads/${newFileName}`;
    
    const brochure = new Brochure({
      university,
      course,
      filePath: relativePath,
      uploadedBy: req.userId
    });
    await brochure.save();
    invalidateBrochuresCache();
    res.json({ message: 'Brochure uploaded successfully', brochure });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading brochure', error: error.message });
  }
});

// Download all brochures as a zip file
router.get('/brochures/download-all', auth, async (req, res) => {
  try {
    const brochures = await Brochure.find({});
    
    if (!brochures || brochures.length === 0) {
      return res.status(404).json({ message: 'No brochures available to download' });
    }

    // Set response headers for zip download
    res.attachment('brochures.zip');
    res.setHeader('Content-Type', 'application/zip');

    // Create archiver instance
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archiver errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({ message: 'Error creating zip file', error: err.message });
    });

    // Pipe archive data to response
    archive.pipe(res);

    // Group brochures by university
    const grouped = {};
    brochures.forEach(b => {
      if (!grouped[b.university]) {
        grouped[b.university] = [];
      }
      grouped[b.university].push(b);
    });

    // Add files to zip with folder structure: brochures/[university]/[filename]
    for (const university of Object.keys(grouped)) {
      const sanitizedUniv = university.replace(/[^a-z0-9]/gi, '_');
      
      for (const brochure of grouped[university]) {
        const filePath = path.join(__dirname, '..', '..', brochure.filePath);
        
        if (fs.existsSync(filePath)) {
          const fileName = path.basename(brochure.filePath);
          const archivePath = `brochures/${sanitizedUniv}/${fileName}`;
          archive.file(filePath, { name: archivePath });
        } else {
          console.warn(`File not found: ${filePath}`);
        }
      }
    }

    // Finalize the archive
    await archive.finalize();
  } catch (error) {
    console.error('Error downloading all brochures:', error);
    res.status(500).json({ message: 'Error downloading brochures', error: error.message });
  }
});

// Get all brochures (optionally filter by university/course)
router.get('/brochures', auth, async (req, res) => {
  try {
    const { university, course } = req.query;
    
    // Check cache if no filters applied
    if (!university && !course) {
      const now = Date.now();
      if (brochuresCache && brochuresCacheTime && (now - brochuresCacheTime < CACHE_DURATION)) {
        return res.json(brochuresCache);
      }
    }
    
    const query = {};
    if (university) query.university = university;
    if (course) query.course = course;
    const brochures = await Brochure.find(query)
      .populate('uploadedBy', 'name email')
      .select('-__v')
      .lean();
    
    // Update cache if no filters
    if (!university && !course) {
      brochuresCache = brochures;
      brochuresCacheTime = Date.now();
    }
    
    res.json(brochures);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching brochures', error: error.message });
  }
});

// Delete brochure
router.delete('/brochure/:id', auth, adminAuth, async (req, res) => {
  try {
    const brochure = await Brochure.findById(req.params.id);
    if (!brochure) {
      return res.status(404).json({ message: 'Brochure not found' });
    }
    // Delete file from filesystem
    const filePath = path.join(__dirname, '..', '..', brochure.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    await Brochure.findByIdAndDelete(req.params.id);
    invalidateBrochuresCache();
    res.json({ message: 'Brochure deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting brochure', error: error.message });
  }
});

// Update brochure
router.put('/brochure/:id', auth, adminAuth, pdfUpload.single('file'), async (req, res) => {
  try {
    const { university, course } = req.body;
    const brochure = await Brochure.findById(req.params.id);
    if (!brochure) {
      return res.status(404).json({ message: 'Brochure not found' });
    }
    
    // If new file uploaded, delete old and rename new
    if (req.file) {
      const oldFilePath = path.join(__dirname, '..', '..', brochure.filePath);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
      const sanitizedUniv = (university || brochure.university).replace(/[^a-z0-9]/gi, '_');
      const sanitizedCourse = (course || brochure.course).replace(/[^a-z0-9]/gi, '_');
      const newFileName = `${sanitizedUniv}-${sanitizedCourse}-brochure.pdf`;
      const oldPath = req.file.path;
      const newPath = path.join(path.dirname(oldPath), newFileName);
      fs.renameSync(oldPath, newPath);
      brochure.filePath = `uploads/${newFileName}`;
    }
    
    if (university) brochure.university = university;
    if (course) brochure.course = course;
    await brochure.save();
    invalidateBrochuresCache();
    res.json({ message: 'Brochure updated successfully', brochure });
  } catch (error) {
    res.status(500).json({ message: 'Error updating brochure', error: error.message });
  }
});

// Upload leads from Excel
router.post('/upload-leads', auth, adminAuth, excelUpload.single('file'), async (req, res) => {
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

    // Get mapping summary for logging
    const mappingSummary = getMappingSummary(data);
    console.log('Excel Field Mapping Summary:', mappingSummary);

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
      // Use smart field mapper to extract lead data WITHOUT user assignment yet
      const leadData = mapExcelRowToLead(row, {
        assignedUserId: null, // Will be assigned after deduplication
        createdBy: req.userId,
        defaultStatus: 'Fresh'
      });

      // Log first few leads for debugging
      if (index < 3) {
        console.log(`Lead ${index + 1} mapped data:`, JSON.stringify(leadData, null, 2));
      }

      // Normalize email and contact for duplicate checking
      const normEmail = leadData.email ? leadData.email.toLowerCase() : '';
      const normContact = leadData.contact ? String(leadData.contact).replace(/\D/g, '') : '';

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

      newLeads.push(leadData);
    });

    // NOW assign users to new leads in round-robin fashion
    newLeads.forEach((lead, index) => {
      lead.assignedTo = userIds[index % userIds.length];
    });

    // Insert leads in batches to avoid memory issues
    const BATCH_SIZE = 1000; // Increased from 500 for better performance
    let insertedCount = 0;
    const insertErrors = [];
    
    if (newLeads.length > 0) {
      console.log(`Attempting to insert ${newLeads.length} leads in batches of ${BATCH_SIZE}...`);
      
      for (let i = 0; i < newLeads.length; i += BATCH_SIZE) {
        const batch = newLeads.slice(i, i + BATCH_SIZE);
        try {
          // Use bulkWrite for better performance
          const bulkOps = batch.map(data => ({
            insertOne: { document: data }
          }));
          
          const result = await Lead.bulkWrite(bulkOps, { ordered: false });
          insertedCount += result.insertedCount || batch.length;
          console.log(`✓ Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.insertedCount || batch.length} leads (Total: ${insertedCount}/${newLeads.length})`);
        } catch (error) {
          console.error(`✗ Error in batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
          
          // Handle partial insertion
          if (error.result && error.result.nInserted) {
            insertedCount += error.result.nInserted;
            console.log(`  ↳ Partial success: ${error.result.nInserted} leads inserted despite errors`);
          }
          
          // Log validation errors for debugging
          if (error.writeErrors) {
            error.writeErrors.slice(0, 3).forEach((err, idx) => {
              console.error(`  ↳ Sample error ${idx + 1}:`, err.errmsg || err.message);
              insertErrors.push(err.errmsg || err.message);
            });
          } else {
            insertErrors.push(error.message);
          }
        }
      }
      
      console.log(`\nFinal insertion summary: ${insertedCount} of ${newLeads.length} leads inserted successfully`);
    }

    // Distribution summary
    const distribution = {};
    newLeads.forEach(leadData => {
      const user = users.find(u => u._id.toString() === leadData.assignedTo.toString());
      if (user) distribution[user.name] = (distribution[user.name] || 0) + 1;
    });
    const distributionText = Object.entries(distribution)
      .map(([name, count]) => `${name}: ${count} leads`)
      .join(', ');

    res.json({
      message: `Upload complete. ${insertedCount} new leads added. ${duplicates.length} duplicates skipped.${insertErrors.length > 0 ? ` ${newLeads.length - insertedCount} failed validation.` : ''}`,
      addedCount: insertedCount,
      skippedDuplicates: duplicates.length,
      duplicateSamples: duplicates.slice(0, 10),
      failedCount: newLeads.length - insertedCount,
      errors: insertErrors.length > 0 ? insertErrors.slice(0, 5) : undefined,
      distribution,
      distributionText
    });
  } catch (error) {
    console.error('Upload leads error:', error);
    res.status(500).json({ message: 'Error uploading leads', error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
});

// Get all users (for admin)
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('-password -__v')
      .lean();
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

    const leads = await Lead.find({ assignedTo: userId })
      .select('_id name contact email city university course profession status notes statusHistory lastContactDate createdAt updatedAt')
      .lean();

    const statusCounts = {};
    leads.forEach(lead => {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    });

    const user = await User.findById(userId).select('-password -__v').lean();

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
    const leads = await Lead.find()
      .select('-__v')
      .populate('assignedTo', '_id name email')
      .populate('assignmentHistory.fromUser', '_id name email')
      .populate('assignmentHistory.toUser', '_id name email')
      .lean();
    
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
    const leads = await Lead.find()
      .select('status assignedTo')
      .populate('assignedTo', 'name email')
      .lean();
    const users = await User.find({ role: 'user' })
      .select('-password -__v')
      .lean();
    
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
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('assignmentHistory.fromUser', 'name email')
      .populate('assignmentHistory.toUser', 'name email')
      .populate('assignmentHistory.changedBy', 'name email role')
      .populate('statusHistory.changedBy', 'name email role')
      .populate('notes.createdBy', 'name email role');
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
      source: lead.source,
      notes: lead.notes,
      statusHistory: lead.statusHistory,
      assignmentHistory: lead.assignmentHistory,
      assignedTo: lead.assignedTo,
      lastContactDate: lead.lastContactDate,
      nextCallDateTime: lead.nextCallDateTime,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update lead from admin (status, note, nextCallDateTime)
router.put('/lead/:id', auth, adminAuth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    const { status, note, nextCallDateTime } = req.body;
    
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
    lead.updatedAt = new Date(); // Explicitly set to ensure notifications work
    lead.lastUpdatedBy = req.userId; // Track that admin made this update
    await lead.save();
    
    // Return populated lead for display
    const updatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email')
      .populate('assignmentHistory.fromUser', 'name email')
      .populate('assignmentHistory.toUser', 'name email')
      .populate('assignmentHistory.changedBy', 'name email');
    
    res.json({
      id: updatedLead._id,
      name: updatedLead.name,
      contact: updatedLead.contact,
      email: updatedLead.email,
      city: updatedLead.city,
      university: updatedLead.university,
      course: updatedLead.course,
      profession: updatedLead.profession,
      status: updatedLead.status,
      notes: updatedLead.notes,
      statusHistory: updatedLead.statusHistory,
      assignmentHistory: updatedLead.assignmentHistory,
      assignedTo: updatedLead.assignedTo,
      lastContactDate: updatedLead.lastContactDate,
      nextCallDateTime: updatedLead.nextCallDateTime,
      createdAt: updatedLead.createdAt,
      updatedAt: updatedLead.updatedAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update specific lead field (university, course) - Admin
router.put('/lead/:id/field', auth, adminAuth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
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
    
    lead.lastUpdatedBy = req.userId; // Track that admin made this update
    await lead.save();
    
    // Return populated lead for display
    const updatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email')
      .populate('assignmentHistory.fromUser', 'name email')
      .populate('assignmentHistory.toUser', 'name email')
      .populate('assignmentHistory.changedBy', 'name email');
    
    res.json({
      id: updatedLead._id,
      name: updatedLead.name,
      contact: updatedLead.contact,
      email: updatedLead.email,
      city: updatedLead.city,
      university: updatedLead.university,
      course: updatedLead.course,
      profession: updatedLead.profession,
      status: updatedLead.status,
      notes: updatedLead.notes,
      statusHistory: updatedLead.statusHistory,
      assignmentHistory: updatedLead.assignmentHistory,
      assignedTo: updatedLead.assignedTo,
      lastContactDate: updatedLead.lastContactDate,
      nextCallDateTime: updatedLead.nextCallDateTime,
      createdAt: updatedLead.createdAt,
      updatedAt: updatedLead.updatedAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Transfer lead to another user
router.patch('/transfer-lead/:leadId', auth, adminAuth, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { newUserId, note } = req.body;

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
    
    // Add transfer note if provided
    if (note && note.trim()) {
      lead.notes = lead.notes || [];
      lead.notes.push({
        content: `[Transfer Note] ${note.trim()}`,
        createdBy: req.userId,
        createdAt: new Date()
      });
    }
    
    // Log assignment change
    lead.assignmentHistory = lead.assignmentHistory || [];
    lead.assignmentHistory.push({
      action: 'transferred',
      fromUser: previousUser,
      toUser: newUserId,
      changedBy: req.userId,
      changedAt: new Date()
    });
    
    // Explicitly set updatedAt to ensure notifications work
    lead.updatedAt = new Date();
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
      .select('name contact email city university course profession status assignedTo updatedAt notes')
      .limit(100)
      .sort({ updatedAt: -1 })
      .populate('assignedTo', 'name email')
      .lean();
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

// Create single lead manually (admin)
router.post('/create-lead', auth, adminAuth, async (req, res) => {
  try {
    const { name, contact, email, city, university, course, profession, source, status, assignedTo } = req.body;
    
    if (!name || !contact) {
      return res.status(400).json({ message: 'Name and contact are required' });
    }

    if (!assignedTo) {
      return res.status(400).json({ message: 'Assigned user is required' });
    }

    // Verify user exists
    const user = await User.findById(assignedTo);
    if (!user || user.role !== 'user') {
      return res.status(404).json({ message: 'Assigned user not found' });
    }

    // Check for duplicates
    const normEmail = email ? email.trim().toLowerCase() : '';
    const normContact = contact ? String(contact).replace(/\D/g, '') : '';

    if (normEmail) {
      const existingByEmail = await Lead.findOne({ email: new RegExp(`^${normEmail}$`, 'i') });
      if (existingByEmail) {
        return res.status(400).json({ message: 'Lead with this email already exists' });
      }
    }

    if (normContact) {
      const existingByContact = await Lead.findOne({ contact: normContact });
      if (existingByContact) {
        return res.status(400).json({ message: 'Lead with this contact already exists' });
      }
    }

    const initialStatus = status || 'Fresh';
    const now = new Date();
    
    const lead = new Lead({
      name: name.trim(),
      contact: normContact,
      email: normEmail || undefined,
      city: city ? city.trim() : undefined,
      university: university ? university.trim() : undefined,
      course: course ? course.trim() : undefined,
      profession: profession ? profession.trim() : undefined,
      source: source || 'Other',
      status: initialStatus,
      assignedTo,
      createdBy: req.userId,
      lastUpdatedBy: req.userId,
      createdAt: now,
      updatedAt: now,
      statusHistory: [{
        status: initialStatus,
        changedAt: now,
        changedBy: req.userId
      }],
      assignmentHistory: [{
        action: 'assigned',
        fromUser: null,
        toUser: assignedTo,
        changedAt: now,
        changedBy: req.userId
      }]
    });

    await lead.save();
    res.status(201).json({ message: 'Lead created successfully', lead });
  } catch (error) {
    res.status(500).json({ message: 'Error creating lead', error: error.message });
  }
});

// Bulk delete leads
router.post('/bulk-delete-leads', auth, adminAuth, async (req, res) => {
  try {
    const { leadIds } = req.body;
    
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ message: 'Lead IDs array is required' });
    }

    const result = await Lead.deleteMany({ _id: { $in: leadIds } });
    
    res.json({ 
      message: `${result.deletedCount} lead(s) deleted successfully`,
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting leads', error: error.message });
  }
});

// Bulk update lead status
router.post('/bulk-update-status', auth, adminAuth, async (req, res) => {
  try {
    const { leadIds, status } = req.body;
    
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ message: 'Lead IDs array is required' });
    }

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    // Valid statuses (must match Lead model)
    const validStatuses = [
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
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // Use bulkWrite for much faster batch updates
    const now = new Date();
    const statusHistoryEntry = {
      status,
      changedBy: req.userId,
      changedAt: now
    };
    
    const bulkOps = leadIds.map(leadId => ({
      updateOne: {
        filter: { _id: leadId },
        update: {
          $set: { 
            status: status,
            updatedAt: now,
            lastUpdatedBy: req.userId
          },
          $push: { 
            statusHistory: statusHistoryEntry 
          }
        }
      }
    }));
    
    const result = await Lead.bulkWrite(bulkOps, { ordered: false });
    
    res.json({ 
      message: `${result.modifiedCount} lead(s) updated successfully`,
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating leads', error: error.message });
  }
});

// Bulk transfer leads
router.post('/bulk-transfer-leads', auth, adminAuth, async (req, res) => {
  try {
    const { leadIds, toUserId } = req.body;
    
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ message: 'Lead IDs array is required' });
    }

    if (!toUserId) {
      return res.status(400).json({ message: 'Target user ID is required' });
    }

    // Verify target user exists
    const toUser = await User.findById(toUserId);
    if (!toUser || toUser.role !== 'user') {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Fetch current assignments for history tracking
    const leads = await Lead.find({ _id: { $in: leadIds } }).select('_id assignedTo').lean();
    
    // Use bulkWrite for much faster batch updates
    const now = new Date();
    const bulkOps = leads.map(lead => ({
      updateOne: {
        filter: { _id: lead._id },
        update: {
          $set: { 
            assignedTo: toUserId,
            updatedAt: now,
            lastUpdatedBy: req.userId
          },
          $push: { 
            assignmentHistory: {
              action: 'transferred',
              fromUser: lead.assignedTo,
              toUser: toUserId,
              changedBy: req.userId,
              changedAt: now
            }
          }
        }
      }
    }));
    
    const result = await Lead.bulkWrite(bulkOps, { ordered: false });

    res.json({ 
      message: `${result.modifiedCount} lead(s) transferred to ${toUser.name} successfully`,
      transferredCount: result.modifiedCount,
      toUser: { name: toUser.name, email: toUser.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error transferring leads', error: error.message });
  }
});

// Distribute leads equally among multiple users
router.post('/bulk-distribute-leads', auth, adminAuth, async (req, res) => {
  try {
    const { leadIds, userIds, status } = req.body;
    
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ message: 'Lead IDs array is required' });
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }

    // Verify all target users exist
    const targetUsers = await User.find({ _id: { $in: userIds }, role: 'user' });
    if (targetUsers.length !== userIds.length) {
      return res.status(404).json({ message: 'One or more target users not found' });
    }

    // Validate status if provided
    if (status) {
      const validStatuses = [
        'Fresh', 'Buffer fresh', 'Did not pick', 'Request call back',
        'Follow up', 'Counselled', 'Interested in next batch',
        'Registration fees paid', 'Enrolled', 'Junk/not interested'
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
    }

    // Fetch current leads for history tracking
    const leads = await Lead.find({ _id: { $in: leadIds } }).select('_id assignedTo status').lean();
    
    // Distribute leads equally among users
    const numUsers = userIds.length;
    const now = new Date();
    
    const bulkOps = leads.map((lead, index) => {
      const targetUserId = userIds[index % numUsers]; // Round-robin distribution
      
      const updateObj = {
        $set: { 
          assignedTo: targetUserId,
          updatedAt: now,
          lastUpdatedBy: req.userId
        },
        $push: { 
          assignmentHistory: {
            action: 'distributed',
            fromUser: lead.assignedTo,
            toUser: targetUserId,
            changedBy: req.userId,
            changedAt: now
          }
        }
      };
      
      // Add status update if provided
      if (status && lead.status !== status) {
        updateObj.$set.status = status;
        updateObj.$push.statusHistory = {
          status: status,
          changedAt: now,
          changedBy: req.userId
        };
      }
      
      return {
        updateOne: {
          filter: { _id: lead._id },
          update: updateObj
        }
      };
    });
    
    const result = await Lead.bulkWrite(bulkOps, { ordered: false });

    // Build distribution summary
    const distribution = {};
    leads.forEach((lead, index) => {
      const targetUserId = userIds[index % numUsers];
      const user = targetUsers.find(u => u._id.toString() === targetUserId);
      if (user) {
        distribution[user.name] = (distribution[user.name] || 0) + 1;
      }
    });

    const summaryParts = Object.entries(distribution).map(([name, count]) => `${name}: ${count}`);
    
    res.json({ 
      message: `${result.modifiedCount} lead(s) distributed equally. ${summaryParts.join(', ')}`,
      modifiedCount: result.modifiedCount,
      distribution: distribution
    });
  } catch (error) {
    res.status(500).json({ message: 'Error distributing leads', error: error.message });
  }
});

// Combined bulk operation: update status AND/OR transfer leads in one transaction
router.post('/bulk-update-leads', auth, adminAuth, async (req, res) => {
  try {
    const { leadIds, status, toUserId } = req.body;
    
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ message: 'Lead IDs array is required' });
    }

    if (!status && !toUserId) {
      return res.status(400).json({ message: 'At least one action (status or transfer) is required' });
    }

    // Validate status if provided
    if (status) {
      const validStatuses = [
        'Fresh', 'Buffer fresh', 'Did not pick', 'Request call back',
        'Follow up', 'Counselled', 'Interested in next batch',
        'Registration fees paid', 'Enrolled', 'Junk/not interested'
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
    }

    // Verify target user if transfer requested
    let toUser = null;
    if (toUserId) {
      toUser = await User.findById(toUserId);
      if (!toUser || toUser.role !== 'user') {
        return res.status(404).json({ message: 'Target user not found' });
      }
    }

    // Fetch current data for history tracking (only if needed)
    const leads = toUserId 
      ? await Lead.find({ _id: { $in: leadIds } }).select('_id assignedTo').lean()
      : null;
    
    // Build update operations
    const now = new Date();
    const bulkOps = leadIds.map((leadId, index) => {
      const update = {
        $set: { updatedAt: now, lastUpdatedBy: req.userId }
      };
      const push = {};

      // Add status update
      if (status) {
        update.$set.status = status;
        push.statusHistory = {
          status,
          changedBy: req.userId,
          changedAt: now
        };
      }

      // Add transfer update
      if (toUserId && leads) {
        const lead = leads.find(l => l._id.toString() === leadId.toString());
        update.$set.assignedTo = toUserId;
        push.assignmentHistory = {
          action: 'transferred',
          fromUser: lead ? lead.assignedTo : null,
          toUser: toUserId,
          changedBy: req.userId,
          changedAt: now
        };
      }

      // Add $push only if there are items to push
      if (Object.keys(push).length > 0) {
        update.$push = push;
      }

      return {
        updateOne: {
          filter: { _id: leadId },
          update
        }
      };
    });
    
    const result = await Lead.bulkWrite(bulkOps, { ordered: false });

    // Build response message
    let actions = [];
    if (status) actions.push(`status to "${status}"`);
    if (toUserId) actions.push(`assignment to ${toUser.name}`);
    
    res.json({ 
      message: `${result.modifiedCount} lead(s) updated: ${actions.join(' and ')}`,
      modifiedCount: result.modifiedCount,
      status: status || null,
      toUser: toUser ? { name: toUser.name, email: toUser.email } : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating leads', error: error.message });
  }
});

// Check for updates - returns if any leads were updated by users (not by admin)
router.get('/check-updates', auth, adminAuth, async (req, res) => {
  try {
    const lastCheck = req.query.lastCheck ? new Date(parseInt(req.query.lastCheck)) : new Date(0);
    
    // Count leads updated by users (not by admin) since last check
    const updatedByUsers = await Lead.countDocuments({
      updatedAt: { $gt: lastCheck },
      lastUpdatedBy: { $ne: req.userId } // Not updated by this admin
    });
    
    // Get the most recent timestamp
    const latestLead = await Lead.findOne()
      .sort({ updatedAt: -1 })
      .select('updatedAt')
      .lean();
    
    res.json({
      hasUpdates: updatedByUsers > 0,
      updateCount: updatedByUsers,
      latestTimestamp: latestLead ? latestLead.updatedAt.getTime() : Date.now()
    });
  } catch (error) {
    console.error('Error in admin check-updates:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
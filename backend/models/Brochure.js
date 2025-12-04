const mongoose = require('mongoose');

const brochureSchema = new mongoose.Schema({
  university: { type: String, required: true },
  course: { type: String, required: true },
  filePath: { type: String, required: true }, // path to PDF file
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

// Indexes for performance optimization
brochureSchema.index({ university: 1, course: 1 }, { unique: true }); // Compound unique index
brochureSchema.index({ university: 1 }); // For filtering by university

module.exports = mongoose.model('Brochure', brochureSchema);

const mongoose = require('mongoose');

const brochureSchema = new mongoose.Schema({
  university: { type: String, required: true },
  course: { type: String, required: true },
  filePath: { type: String, required: true }, // path to PDF file
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model('Brochure', brochureSchema);

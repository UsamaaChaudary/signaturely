const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number },
  pageCount: { type: Number, default: 1 },
  status: { type: String, enum: ['active', 'deleted'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);

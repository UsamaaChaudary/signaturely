const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  ownerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalName: { type: String, required: true },
  filePath:     { type: String, required: true },
  fileSize:     { type: Number },
  pageCount:    { type: Number, default: 1 },
  status:       { type: String, enum: ['active', 'deleted'], default: 'active' },
  isTemplate:   { type: Boolean, default: false },
}, { timestamps: true });

documentSchema.index({ ownerId: 1, status: 1, isTemplate: 1 });

module.exports = mongoose.model('Document', documentSchema);

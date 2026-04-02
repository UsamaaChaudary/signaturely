const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  signerId: { type: String, required: true },
  type: { type: String, enum: ['signature', 'initials', 'date', 'text', 'checkbox'], required: true },
  page: { type: Number, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  required: { type: Boolean, default: true },
  value: { type: String, default: null },
});

const signerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  signingToken: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'viewed', 'completed', 'declined'], default: 'pending' },
  signedAt: { type: Date },
  viewedAt: { type: Date },
  ipAddress: { type: String },
  declineReason: { type: String },
});

const signingRequestSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  signers: [signerSchema],
  fields: [fieldSchema],
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
  completedFilePath: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('SigningRequest', signingRequestSchema);

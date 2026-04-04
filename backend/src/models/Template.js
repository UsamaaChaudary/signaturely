const mongoose = require('mongoose');

const annotationSchema = new mongoose.Schema({
  id:       { type: String, required: true },
  type:     { type: String, enum: ['text'], default: 'text' },
  page:     { type: Number, required: true },
  x:        { type: Number, required: true },
  y:        { type: Number, required: true },
  width:    { type: Number, required: true },
  height:   { type: Number, required: true },
  content:       { type: String, default: '' },
  fontSize:      { type: Number, default: 14 },
  fontSizeRatio: { type: Number },  // fontSize / naturalPageWidthPx; enables proportional scaling across render contexts
  bold:          { type: Boolean, default: false },
  color:         { type: String, default: '#000000' },
});

const templateFieldSchema = new mongoose.Schema({
  signerSlot: { type: String, required: true }, // '1', '2', etc — maps to frontend signerMapping tempId
  type:       { type: String, enum: ['signature', 'initials', 'date', 'text', 'checkbox'], required: true },
  page:       { type: Number, required: true },
  x:          { type: Number, required: true },
  y:          { type: Number, required: true },
  width:      { type: Number, required: true },
  height:     { type: Number, required: true },
  required:   { type: Boolean, default: true },
});

const templateSchema = new mongoose.Schema({
  ownerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  documentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  signerCount: { type: Number, required: true, min: 1 },
  usageCount:  { type: Number, default: 0 },
  status:      { type: String, enum: ['active', 'archived'], default: 'active' },
  fields:      [templateFieldSchema],
  annotations: { type: [annotationSchema], default: [] },
}, { timestamps: true });

templateSchema.index({ ownerId: 1, status: 1 });

module.exports = mongoose.model('Template', templateSchema);

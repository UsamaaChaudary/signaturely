const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  ownerId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:           { type: String, required: true, trim: true },
  email:          { type: String, required: true, lowercase: true, trim: true },
  company:        { type: String, default: '' },
  phone:          { type: String, default: '' },
  notes:          { type: String, default: '' },
  tags:           [{ type: String }],
  totalSent:      { type: Number, default: 0 },
  totalCompleted: { type: Number, default: 0 },
  status:         { type: String, enum: ['active', 'deleted'], default: 'active' },
}, { timestamps: true });

contactSchema.index({ ownerId: 1, email: 1 }, { unique: true });
contactSchema.index({ ownerId: 1, name: 1 });
contactSchema.index({ ownerId: 1, tags: 1 });
contactSchema.index({ ownerId: 1, status: 1 });

module.exports = mongoose.model('Contact', contactSchema);

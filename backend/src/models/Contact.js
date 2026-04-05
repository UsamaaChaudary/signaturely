const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  ownerId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:           { type: String, required: true, trim: true, default: '' },
  email:          { type: String, required: true, lowercase: true, trim: true },
  company:        { type: String, default: '' },
  phone:          { type: String, default: '' },
  notes:          { type: String, default: '' },
  tags:           [{ type: String }],
  customFields:   { type: Map, of: String, default: {} },
  totalSent:      { type: Number, default: 0 },
  totalCompleted: { type: Number, default: 0 },
  status:         { type: String, enum: ['active', 'deleted'], default: 'active' },
}, { timestamps: true });

contactSchema.pre('save', function (next) {
  if (!this.name && this.email) this.name = this.email.split('@')[0];
  next();
});

contactSchema.index({ ownerId: 1, email: 1 }, { unique: true });
contactSchema.index({ ownerId: 1, name: 1 });
contactSchema.index({ ownerId: 1, tags: 1 });
contactSchema.index({ ownerId: 1, status: 1 });

module.exports = mongoose.model('Contact', contactSchema);

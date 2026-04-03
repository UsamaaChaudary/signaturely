const express = require('express');
const auth = require('../middleware/auth');
const Template = require('../models/Template');
const Document = require('../models/Document');
const router = express.Router();

// POST /api/templates — create
router.post('/', auth, async (req, res) => {
  try {
    const { documentId, name, description, fields, signerCount } = req.body;
    if (!documentId || !name || !signerCount) {
      return res.status(400).json({ error: 'documentId, name, and signerCount are required' });
    }

    const doc = await Document.findOne({ _id: documentId, ownerId: req.user._id, status: 'active' });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const template = await Template.create({
      ownerId: req.user._id,
      documentId,
      name,
      description: description || '',
      signerCount,
      fields: fields || [],
    });

    // Mark document as used in a template
    doc.isTemplate = true;
    await doc.save();

    const populated = await template.populate('documentId', 'originalName filePath pageCount');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/templates — list active templates
router.get('/', auth, async (req, res) => {
  try {
    const templates = await Template.find({ ownerId: req.user._id, status: 'active' })
      .populate('documentId', 'originalName filePath pageCount')
      .sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/templates/:id — single template with full fields
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findOne({ _id: req.params.id, ownerId: req.user._id })
      .populate('documentId', 'originalName filePath pageCount');
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/templates/:id — update
router.patch('/:id', auth, async (req, res) => {
  try {
    const allowed = ['name', 'description', 'fields', 'signerCount'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const template = await Template.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id, status: 'active' },
      updates,
      { new: true, runValidators: true }
    ).populate('documentId', 'originalName filePath pageCount');

    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/templates/:id — archive
router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { status: 'archived' },
      { new: true }
    );
    if (!template) return res.status(404).json({ error: 'Template not found' });

    // Clear isTemplate flag on document if no other active templates reference it
    const otherActive = await Template.countDocuments({
      documentId: template.documentId,
      status: 'active',
      _id: { $ne: template._id },
    });
    if (otherActive === 0) {
      await Document.updateOne({ _id: template.documentId }, { isTemplate: false });
    }

    res.json({ message: 'Template archived' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

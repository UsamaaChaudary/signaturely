const express = require('express');
const auth = require('../middleware/auth');
const Contact = require('../models/Contact');
const SigningRequest = require('../models/SigningRequest');
const router = express.Router();

// POST /api/contacts — create
router.post('/', auth, async (req, res) => {
  try {
    const { name, email, company, phone, notes, tags } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email are required' });

    const contact = await Contact.create({
      ownerId: req.user._id,
      name,
      email,
      company: company || '',
      phone: phone || '',
      notes: notes || '',
      tags: tags || [],
    });
    res.status(201).json(contact);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'A contact with this email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/contacts — list with search + pagination
router.get('/', auth, async (req, res) => {
  try {
    const { search, tag, page = 1, limit = 50 } = req.query;
    const query = { ownerId: req.user._id, status: 'active' };

    if (search) {
      const re = new RegExp(search, 'i');
      query.$or = [{ name: re }, { email: re }, { company: re }];
    }
    if (tag) query.tags = tag;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [contacts, total] = await Promise.all([
      Contact.find(query).sort({ name: 1 }).skip(skip).limit(parseInt(limit)),
      Contact.countDocuments(query),
    ]);

    res.json({ contacts, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/contacts/:id — profile with signing history
router.get('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, ownerId: req.user._id, status: 'active' });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const requests = await SigningRequest.find({ ownerId: req.user._id, contactIds: contact._id })
      .populate('documentId', 'originalName filePath pageCount')
      .sort({ createdAt: -1 });

    res.json({ contact, requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/contacts/:id — update
router.patch('/:id', auth, async (req, res) => {
  try {
    const allowed = ['name', 'email', 'company', 'phone', 'notes', 'tags'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id, status: 'active' },
      updates,
      { new: true, runValidators: true }
    );
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    res.json(contact);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'A contact with this email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/contacts/:id — soft delete
router.delete('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { status: 'deleted' },
      { new: true }
    );
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    res.json({ message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contacts/import — bulk upsert from CSV
router.post('/import', auth, async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'contacts array is required' });
    }

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (const row of contacts) {
      if (!row.email || !row.name) {
        errors.push({ row, reason: 'missing name or email' });
        continue;
      }
      try {
        const result = await Contact.findOneAndUpdate(
          { ownerId: req.user._id, email: row.email.toLowerCase().trim() },
          { $setOnInsert: { name: row.name, company: row.company || '', ownerId: req.user._id } },
          { upsert: true, new: false, rawResult: true }
        );
        if (result.lastErrorObject && result.lastErrorObject.upserted) {
          created++;
        } else {
          skipped++;
        }
      } catch (e) {
        errors.push({ row, reason: e.message });
      }
    }

    res.json({ created, skipped, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');
const auth = require('../middleware/auth');
const cloudinary = require('../utils/cloudinary');
const Document = require('../models/Document');
const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'signaturely/originals',
    resource_type: 'raw',
    public_id: () => Date.now() + '-' + Math.round(Math.random() * 1e9),
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF files allowed'));
    cb(null, true);
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Get page count — fetch from Cloudinary URL (req.file.path is the HTTPS URL)
    const response = await axios.get(req.file.path, { responseType: 'arraybuffer' });
    const pdfDoc = await PDFDocument.load(Buffer.from(response.data));
    const pageCount = pdfDoc.getPageCount();

    const doc = await Document.create({
      ownerId: req.user._id,
      originalName: req.file.originalname,
      filePath: req.file.path, // Cloudinary HTTPS URL
      fileSize: req.file.size,
      pageCount,
    });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const docs = await Document.find({ ownerId: req.user._id, status: 'active' }).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id, status: 'active' },
      { originalName: name.trim() },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { status: 'deleted' },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

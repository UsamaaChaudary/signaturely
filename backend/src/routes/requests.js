const express = require('express');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const SigningRequest = require('../models/SigningRequest');
const Document = require('../models/Document');
const Template = require('../models/Template');
const emailService = require('../services/emailService');
const { updateContactStats } = require('../utils/contactStats');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { documentId, title, message, signers, fields, signerMapping, contactIds, templateId } = req.body;

    // Verify document ownership
    const doc = await Document.findOne({ _id: documentId, ownerId: req.user._id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Assign signing tokens to signers
    const signersWithTokens = signers.map(s => ({
      name: s.name,
      email: s.email,
      signingToken: uuidv4(),
      status: 'pending',
    }));

    // Create request first with empty fields so MongoDB assigns _id to each signer subdocument
    const request = await SigningRequest.create({
      documentId,
      ownerId: req.user._id,
      templateId: templateId || null,
      contactIds: contactIds || [],
      title,
      message: message || '',
      signers: signersWithTokens,
      fields: [],
      status: 'pending',
    });

    // Map temp frontend signer IDs to actual MongoDB signer ObjectIds.
    // Frontend sends signerMapping: [{ tempId: '1', index: 0 }, { tempId: '2', index: 1 }, ...]
    // where tempId is a 1-indexed string and index is 0-indexed position in the signers array.
    const mappedFields = (fields || []).map(field => {
      let signerIndex = 0;

      if (signerMapping && signerMapping.length > 0) {
        const mapping = signerMapping.find(m => m.tempId === field.signerId);
        if (mapping !== undefined) {
          signerIndex = mapping.index;
        }
      } else {
        // Fallback: treat signerId as a 1-indexed string
        const parsed = parseInt(field.signerId, 10);
        signerIndex = isNaN(parsed) ? 0 : Math.max(0, parsed - 1);
      }

      const actualSigner = request.signers[signerIndex];
      return {
        ...field,
        signerId: actualSigner ? actualSigner._id.toString() : field.signerId,
      };
    });

    request.fields = mappedFields;
    await request.save();

    // Increment contact totalSent stats
    await updateContactStats(contactIds, { totalSent: 1 });

    // Increment template usage count
    if (templateId) {
      await Template.updateOne({ _id: templateId, ownerId: req.user._id }, { $inc: { usageCount: 1 } });
    }

    // Send emails to all signers
    const frontendUrl = process.env.FRONTEND_URL;
    for (const signer of request.signers) {
      const signingUrl = `${frontendUrl}/sign/${signer.signingToken}`;
      await emailService.sendSigningInvitation({
        to: signer.email,
        signerName: signer.name,
        ownerName: req.user.name,
        title: request.title,
        message: request.message,
        signingUrl,
      });
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const requests = await SigningRequest.find({ ownerId: req.user._id })
      .populate('documentId', 'originalName filePath pageCount')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const request = await SigningRequest.findOne({ _id: req.params.id, ownerId: req.user._id })
      .populate('documentId', 'originalName filePath pageCount');
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const request = await SigningRequest.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id, status: { $in: ['pending', 'in_progress'] } },
      { status: 'cancelled' },
      { new: true }
    );
    if (!request) return res.status(404).json({ error: 'Request not found or cannot be cancelled' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/remind', auth, async (req, res) => {
  try {
    const request = await SigningRequest.findOne({ _id: req.params.id, ownerId: req.user._id })
      .populate('documentId', 'originalName');
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const frontendUrl = process.env.FRONTEND_URL;
    const pendingSigners = request.signers.filter(s => s.status !== 'completed' && s.status !== 'declined');

    for (const signer of pendingSigners) {
      const signingUrl = `${frontendUrl}/sign/${signer.signingToken}`;
      await emailService.sendReminder({
        to: signer.email,
        signerName: signer.name,
        ownerName: req.user.name,
        title: request.title,
        signingUrl,
      });
    }

    res.json({ message: `Reminders sent to ${pendingSigners.length} signer(s)` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

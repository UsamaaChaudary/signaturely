const express = require('express');
const path = require('path');
const SigningRequest = require('../models/SigningRequest');
const Document = require('../models/Document');
const pdfService = require('../services/pdfService');
const emailService = require('../services/emailService');
const router = express.Router();

router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const request = await SigningRequest.findOne({ 'signers.signingToken': token })
      .populate('documentId', 'originalName filePath pageCount');

    if (!request) return res.status(404).json({ error: 'Invalid signing link' });
    if (request.status === 'cancelled') return res.status(400).json({ error: 'This signing request has been cancelled' });

    const signer = request.signers.find(s => s.signingToken === token);
    if (!signer) return res.status(404).json({ error: 'Signer not found' });
    if (signer.status === 'completed') return res.status(400).json({ error: 'already_signed' });
    if (signer.status === 'declined') return res.status(400).json({ error: 'already_declined' });

    // Mark as viewed
    if (signer.status === 'pending') {
      signer.status = 'viewed';
      signer.viewedAt = new Date();
      signer.ipAddress = req.ip || req.connection.remoteAddress;

      if (request.status === 'pending') request.status = 'in_progress';
      await request.save();
    }

    // Get only this signer's fields
    const signerFields = request.fields.filter(f => f.signerId === signer._id.toString());

    // Build file URL
    const docPath = request.documentId.filePath;
    const fileName = path.basename(docPath);

    res.json({
      requestId: request._id,
      title: request.title,
      message: request.message,
      signer: {
        id: signer._id,
        name: signer.name,
        email: signer.email,
        status: signer.status,
      },
      document: {
        name: request.documentId.originalName,
        pageCount: request.documentId.pageCount,
        fileUrl: `/uploads/originals/${fileName}`,
      },
      fields: signerFields,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:token/submit', async (req, res) => {
  try {
    const { token } = req.params;
    const { fields: submittedFields } = req.body;

    const request = await SigningRequest.findOne({ 'signers.signingToken': token })
      .populate('documentId');

    if (!request) return res.status(404).json({ error: 'Invalid signing link' });
    if (request.status === 'cancelled') return res.status(400).json({ error: 'Request cancelled' });

    const signer = request.signers.find(s => s.signingToken === token);
    if (!signer) return res.status(404).json({ error: 'Signer not found' });
    if (signer.status === 'completed') return res.status(400).json({ error: 'Already signed' });

    // Update field values
    for (const submitted of submittedFields) {
      const field = request.fields.id(submitted.fieldId);
      if (field && field.signerId === signer._id.toString()) {
        field.value = submitted.value;
      }
    }

    // Mark signer as completed
    signer.status = 'completed';
    signer.signedAt = new Date();
    signer.ipAddress = req.ip || req.connection.remoteAddress;

    // Check if all signers completed
    const allCompleted = request.signers.every(s => s.status === 'completed' || s.status === 'declined');
    const anyCompleted = request.signers.some(s => s.status === 'completed');

    if (allCompleted && anyCompleted) {
      request.status = 'completed';

      // Merge PDF
      try {
        const completedPath = await pdfService.mergeSignatures(request);
        request.completedFilePath = completedPath;
        await request.save();

        // Send completion emails
        await emailService.sendCompletionEmail({
          request,
          completedFilePath: completedPath,
        });
      } catch (pdfErr) {
        console.error('PDF merge error:', pdfErr);
        await request.save();
      }
    } else {
      await request.save();
    }

    res.json({ message: 'Signed successfully', status: request.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:token/decline', async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;

    const request = await SigningRequest.findOne({ 'signers.signingToken': token });
    if (!request) return res.status(404).json({ error: 'Invalid signing link' });

    const signer = request.signers.find(s => s.signingToken === token);
    if (!signer) return res.status(404).json({ error: 'Signer not found' });
    if (signer.status === 'completed') return res.status(400).json({ error: 'Already signed' });

    signer.status = 'declined';
    signer.declineReason = reason || '';
    signer.ipAddress = req.ip || req.connection.remoteAddress;

    await request.save();
    res.json({ message: 'Declined successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

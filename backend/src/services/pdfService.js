const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const axios = require('axios');
const cloudinary = require('../utils/cloudinary');

async function mergeSignatures(request) {
  const doc = request.documentId;
  // Fetch original PDF from Cloudinary (filePath is now an HTTPS URL)
  const fetchResponse = await axios.get(doc.filePath, { responseType: 'arraybuffer' });
  const pdfDoc = await PDFDocument.load(Buffer.from(fetchResponse.data));
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const field of request.fields) {
    if (!field.value) continue;

    const page = pages[field.page];
    if (!page) continue;

    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Convert percentage coordinates to actual PDF coordinates
    // PDF coordinate system: origin is bottom-left
    const x = field.x * pageWidth;
    const y = pageHeight - (field.y * pageHeight) - (field.height * pageHeight); // flip Y
    const w = field.width * pageWidth;
    const h = field.height * pageHeight;

    if (field.type === 'signature' || field.type === 'initials') {
      try {
        // field.value is base64 PNG
        const base64Data = field.value.replace(/^data:image\/png;base64,/, '');
        const pngBytes = Buffer.from(base64Data, 'base64');
        const pngImage = await pdfDoc.embedPng(pngBytes);
        page.drawImage(pngImage, { x, y, width: w, height: h });
      } catch (e) {
        console.error('Error embedding signature:', e);
      }
    } else if (field.type === 'text' || field.type === 'date') {
      const fontSize = Math.min(h * 0.6, 12);
      page.drawText(field.value, {
        x: x + 2,
        y: y + (h / 2) - (fontSize / 2),
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
        maxWidth: w - 4,
      });
    } else if (field.type === 'checkbox' && field.value === 'true') {
      const checkFontSize = Math.min(h * 0.7, 12);
      page.drawText('✓', {
        x: x + 2,
        y: y + (h / 2) - (checkFontSize / 2),
        size: checkFontSize,
        font,
        color: rgb(0, 0.5, 0),
      });
    }
  }

  const pdfBytes = await pdfDoc.save();

  // Upload completed PDF to Cloudinary and return the secure URL
  const secureUrl = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'signaturely/completed',
        resource_type: 'raw',
        format: 'pdf',
        public_id: `completed_${request._id}`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(Buffer.from(pdfBytes));
  });

  return secureUrl;
}

module.exports = { mergeSignatures };

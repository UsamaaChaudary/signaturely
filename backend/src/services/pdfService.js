const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function mergeSignatures(request) {
  const doc = request.documentId;
  const originalPdfBytes = fs.readFileSync(doc.filePath);
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
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

  const completedDir = path.join(__dirname, '../../uploads/completed');
  fs.mkdirSync(completedDir, { recursive: true });

  const outputPath = path.join(completedDir, `completed_${request._id}.pdf`);
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);

  return outputPath;
}

module.exports = { mergeSignatures };

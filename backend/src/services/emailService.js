const nodemailer = require('nodemailer');

// ─── Resend (production) ────────────────────────────────────────────────────

async function sendViaResend({ to, subject, html, attachments = [] }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Signo <uzair@bookleeai.com>',
      to,
      subject,
      html,
      ...(attachments.length > 0 && {
        attachments: attachments.map(({ filename, content }) => ({
          filename,
          content: content.toString('base64'),
        })),
      }),
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data));
  return data;
}

// ─── Ethereal (local dev fallback) ─────────────────────────────────────────

let etherealTransporter;

async function getEtherealTransporter() {
  if (etherealTransporter) return etherealTransporter;
  console.log('[email] RESEND_API_KEY not set — falling back to Ethereal');
  const testAccount = await nodemailer.createTestAccount();
  etherealTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  console.log('[email] Ethereal preview at: https://ethereal.email');
  console.log('   User:', testAccount.user);
  console.log('   Pass:', testAccount.pass);
  return etherealTransporter;
}

// ─── Core send ──────────────────────────────────────────────────────────────

function useResend() {
  return process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_placeholder';
}

async function sendEmail({ to, subject, html }) {
  console.log(`[email] Sending "${subject}" to ${to}`);
  try {
    if (useResend()) {
      console.log('[email] Using Resend API — key prefix:', process.env.RESEND_API_KEY.slice(0, 8));
      return await sendViaResend({ to, subject, html });
    }
    const t = await getEtherealTransporter();
    const info = await t.sendMail({
      from: '"Signo" <uzair@bookleeai.com>',
      to,
      subject,
      html,
    });
    if (nodemailer.getTestMessageUrl(info)) {
      console.log('[email] Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    return info;
  } catch (err) {
    console.error('[email] sendEmail failed:', err.message);
    console.error('[email] Full error:', err);
    throw err;
  }
}

// ─── Public functions ───────────────────────────────────────────────────────

async function sendSigningInvitation({ to, signerName, ownerName, title, message, signingUrl }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #4F46E5; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Signo</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2>Hi ${signerName},</h2>
        <p><strong>${ownerName}</strong> has requested your signature on <strong>${title}</strong>.</p>
        ${message ? `<p style="background: white; padding: 15px; border-left: 4px solid #4F46E5;">${message}</p>` : ''}
        <div style="text-align: center; margin: 30px 0;">
          <a href="${signingUrl}" style="background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Review and Sign Document
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">Or copy this link: ${signingUrl}</p>
      </div>
    </div>
  `;
  return sendEmail({ to, subject: `${ownerName} requests your signature on "${title}"`, html });
}

async function sendReminder({ to, signerName, ownerName, title, signingUrl }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #4F46E5; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Signo</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2>Reminder: Hi ${signerName},</h2>
        <p>This is a friendly reminder that <strong>${ownerName}</strong> is waiting for your signature on <strong>${title}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${signingUrl}" style="background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Sign Now
          </a>
        </div>
      </div>
    </div>
  `;
  return sendEmail({ to, subject: `Reminder: Please sign "${title}"`, html });
}

async function sendCompletionEmail({ request, completedFilePath, ownerEmail, ownerName }) {
  const axios = require('axios');
  let attachments = [];
  if (completedFilePath) {
    try {
      const fileResponse = await axios.get(completedFilePath, { responseType: 'arraybuffer' });
      attachments = [{
        filename: `signed_${request.title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        content: Buffer.from(fileResponse.data),
      }];
    } catch (err) {
      console.error('[email] Failed to fetch completed PDF for attachment:', err.message);
    }
  }

  const signerNames = request.signers.map(s => s.name || s.email).join(', ');

  // Signer notification
  const signerHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #4F46E5; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Signo</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <div style="text-align: center; font-size: 48px; margin-bottom: 20px;">&#10003;</div>
        <h2>Document Fully Signed!</h2>
        <p>All parties have signed <strong>${request.title}</strong>.</p>
        <p>The completed document is attached to this email.</p>
      </div>
    </div>
  `;

  for (const signer of request.signers) {
    console.log(`[email] Sending completion email to signer ${signer.email}`);
    try {
      if (useResend()) {
        await sendViaResend({ to: signer.email, subject: `"${request.title}" has been fully signed`, html: signerHtml, attachments });
      } else {
        const t = await getEtherealTransporter();
        const info = await t.sendMail({
          from: '"Signo" <uzair@bookleeai.com>',
          to: signer.email,
          subject: `"${request.title}" has been fully signed`,
          html: signerHtml,
          attachments,
        });
        if (nodemailer.getTestMessageUrl(info)) {
          console.log(`[email] Completion preview (${signer.email}):`, nodemailer.getTestMessageUrl(info));
        }
      }
    } catch (err) {
      console.error(`[email] sendCompletionEmail failed for ${signer.email}:`, err.message);
    }
  }

  // Owner / admin notification
  if (ownerEmail) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const dashboardUrl = `${frontendUrl}/dashboard`;
    const ownerHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4F46E5; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Signo</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <div style="text-align: center; font-size: 48px; margin-bottom: 20px;">&#9989;</div>
          <h2>Hi ${ownerName || 'there'},</h2>
          <p>Your document <strong>${request.title}</strong> has been signed by all parties.</p>
          <p style="color: #555;">Signed by: ${signerNames}</p>
          <p>The fully signed PDF is attached to this email.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
              View in Dashboard
            </a>
          </div>
        </div>
      </div>
    `;
    console.log(`[email] Sending completion notification to owner ${ownerEmail}`);
    try {
      if (useResend()) {
        await sendViaResend({ to: ownerEmail, subject: `✅ "${request.title}" has been fully signed`, html: ownerHtml, attachments });
      } else {
        const t = await getEtherealTransporter();
        const info = await t.sendMail({
          from: '"Signo" <uzair@bookleeai.com>',
          to: ownerEmail,
          subject: `✅ "${request.title}" has been fully signed`,
          html: ownerHtml,
          attachments,
        });
        if (nodemailer.getTestMessageUrl(info)) {
          console.log(`[email] Owner completion preview (${ownerEmail}):`, nodemailer.getTestMessageUrl(info));
        }
      }
    } catch (err) {
      console.error(`[email] Owner completion email failed for ${ownerEmail}:`, err.message);
    }
  }
}

module.exports = { sendSigningInvitation, sendReminder, sendCompletionEmail };

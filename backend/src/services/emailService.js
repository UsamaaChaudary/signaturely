const nodemailer = require('nodemailer');

let transporter;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_placeholder') {
    // Use Resend via SMTP
    transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    });
  } else {
    // Use Ethereal for testing
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('Using Ethereal email - preview at: https://ethereal.email');
    console.log('   User:', testAccount.user);
    console.log('   Pass:', testAccount.pass);
  }

  return transporter;
}

async function sendEmail({ to, subject, html }) {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: '"Signo" <uzair@bookleeai.com>',
    to,
    subject,
    html,
  });

  if (nodemailer.getTestMessageUrl(info)) {
    console.log('Email Preview URL:', nodemailer.getTestMessageUrl(info));
  }

  return info;
}

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

async function sendCompletionEmail({ request, completedFilePath }) {
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
      console.error('Failed to fetch completed PDF for email attachment:', err.message);
    }
  }

  const allEmails = [
    ...request.signers.map(s => ({ email: s.email, name: s.name })),
  ];

  for (const recipient of allEmails) {
    const html = `
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

    const t = await getTransporter();
    const info = await t.sendMail({
      from: '"Signo" <uzair@bookleeai.com>',
      to: recipient.email,
      subject: `"${request.title}" has been fully signed`,
      html,
      attachments,
    });

    if (nodemailer.getTestMessageUrl(info)) {
      console.log(`Completion email preview (${recipient.email}):`, nodemailer.getTestMessageUrl(info));
    }
  }
}

module.exports = { sendSigningInvitation, sendReminder, sendCompletionEmail };

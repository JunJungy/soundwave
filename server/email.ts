import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const isEmailConfigured = 
      process.env.SMTP_HOST && 
      process.env.SMTP_PORT && 
      process.env.SMTP_USER && 
      process.env.SMTP_PASS;

    if (!isEmailConfigured) {
      console.warn('Email not configured. Skipping email notification.');
      console.warn('To enable email, set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables.');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    });

    console.log(`Email sent successfully to ${options.to}`);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

export async function sendBanAppealNotification(appeal: {
  username: string;
  email: string;
  reason: string;
  ipAddress?: string;
  id: string;
}): Promise<void> {
  const subject = `New Ban Appeal from ${appeal.username}`;
  
  const text = `
New Ban Appeal Submitted

Username: ${appeal.username}
Email: ${appeal.email}
IP Address: ${appeal.ipAddress || 'Unknown'}
Appeal ID: ${appeal.id}

Reason:
${appeal.reason}

Please review this appeal in the admin panel.
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #9333ea; color: white; padding: 15px; border-radius: 5px; }
    .content { background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-top: 20px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #555; }
    .value { margin-top: 5px; }
    .reason-box { background-color: white; padding: 15px; border-left: 4px solid #9333ea; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New Ban Appeal Submitted</h2>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">Username:</div>
        <div class="value">${appeal.username}</div>
      </div>
      <div class="field">
        <div class="label">Email:</div>
        <div class="value">${appeal.email}</div>
      </div>
      <div class="field">
        <div class="label">IP Address:</div>
        <div class="value">${appeal.ipAddress || 'Unknown'}</div>
      </div>
      <div class="field">
        <div class="label">Appeal ID:</div>
        <div class="value">${appeal.id}</div>
      </div>
      <div class="field">
        <div class="label">Reason:</div>
        <div class="reason-box">${appeal.reason}</div>
      </div>
    </div>
    <p style="margin-top: 20px; color: #666; font-size: 14px;">
      Please review this appeal in the Soundwave admin panel.
    </p>
  </div>
</body>
</html>
`;

  await sendEmail({
    to: 'void@voidmain.xyz',
    subject,
    text,
    html,
  });
}

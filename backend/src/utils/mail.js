const nodemailer = require('nodemailer');

const ORANGE = '#f7941d';
const BLACK = '#111111';

function isMailConfigured() {
  return Boolean(
    process.env.SMTP_HOST
    && process.env.SMTP_USER
    && process.env.SMTP_PASS,
  );
}

function createTransport() {
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function complaintConfirmationHtml({ complaint, assigneeName, assigneePhone, assigneeEmail, showCoordinator }) {
  const created = new Date(complaint.createdAt || Date.now()).toLocaleString('en-IN', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const coordinatorBlock = showCoordinator ? `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin-bottom:24px;">
                <tr><td style="padding:16px 20px;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;">Your Service Coordinator</p>
                  <p style="margin:0;font-size:15px;font-weight:700;color:#78350f;">${assigneeName}</p>
                  <p style="margin:8px 0 0;font-size:14px;color:#92400e;line-height:1.5;">
                    Phone: <a href="tel:${assigneePhone}" style="color:#c2410c;text-decoration:none;">${assigneePhone}</a><br/>
                    Email: <a href="mailto:${assigneeEmail}" style="color:#c2410c;text-decoration:none;">${assigneeEmail}</a>
                  </p>
                </td></tr>
              </table>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Complaint Registered — SolarJi</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.08);">
          <tr>
            <td style="background:${BLACK};padding:28px 32px;border-bottom:4px solid ${ORANGE};">
              <p style="margin:0;font-size:26px;font-weight:900;color:${ORANGE};letter-spacing:-.02em;">SolarJi</p>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.65);">Solar Energy Solutions · Service Support</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:.08em;">Complaint Registered</p>
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:${BLACK};line-height:1.3;">Thank you, ${complaint.name}</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
                We have received your service request. Our team will review it and contact you shortly.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafafa;border:1px solid #eee;border-radius:12px;margin-bottom:24px;">
                <tr><td style="padding:16px 20px;border-bottom:1px solid #eee;">
                  <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;">Reference Number</p>
                  <p style="margin:4px 0 0;font-size:18px;font-weight:800;color:${BLACK};font-family:monospace;">${complaint.complaintNumber}</p>
                </td></tr>
                <tr><td style="padding:16px 20px;border-bottom:1px solid #eee;">
                  <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;">Issue Category</p>
                  <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#374151;">${complaint.category}</p>
                </td></tr>
                <tr><td style="padding:16px 20px;border-bottom:1px solid #eee;">
                  <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;">Registered Details</p>
                  <p style="margin:6px 0 0;font-size:14px;color:#374151;line-height:1.5;">
                    <strong>Name:</strong> ${complaint.name}<br/>
                    <strong>Phone:</strong> ${complaint.phone}<br/>
                    <strong>Email:</strong> ${complaint.email}<br/>
                    <strong>Address:</strong> ${complaint.address}
                  </p>
                </td></tr>
                <tr><td style="padding:16px 20px;">
                  <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;">Submitted On</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#374151;">${created}</p>
                </td></tr>
              </table>
              ${coordinatorBlock}
              <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
                Please keep your reference number <strong>${complaint.complaintNumber}</strong> for future correspondence.
                ${showCoordinator ? 'For urgent issues, call us directly at the number above.' : 'Our team will contact you shortly regarding your complaint.'}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#fafafa;border-top:1px solid #eee;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} SolarJi · All rights reserved</p>
              <p style="margin:6px 0 0;font-size:11px;color:#d1d5db;">This is an automated confirmation. Please do not reply to this email unless instructed.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendComplaintConfirmation(complaint, assignee = null) {
  if (!isMailConfigured()) {
    console.warn('SMTP not configured — skipping complaint confirmation email');
    return { sent: false, reason: 'smtp_not_configured' };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const assigneeName = assignee?.name || '';
  const assigneePhone = assignee?.phone || '';
  const assigneeEmail = assignee?.email || '';
  const showCoordinator = Boolean(assignee?.name && (assignee?.phone || assignee?.email));

  const html = complaintConfirmationHtml({
    complaint,
    assigneeName,
    assigneePhone,
    assigneeEmail,
    showCoordinator,
  });

  const transport = createTransport();
  await transport.sendMail({
    from: `"SolarJi Support" <${from}>`,
    to: complaint.email,
    subject: `Complaint Registered — ${complaint.complaintNumber} | SolarJi`,
    html,
    text: [
      `Dear ${complaint.name},`,
      '',
      `Your complaint has been registered successfully.`,
      `Reference: ${complaint.complaintNumber}`,
      `Issue: ${complaint.category}`,
      '',
      ...(showCoordinator ? [
        `Service Coordinator: ${assigneeName}`,
        `Phone: ${assigneePhone}`,
        `Email: ${assigneeEmail}`,
        '',
      ] : [
        'Our team will review your complaint and contact you shortly.',
        '',
      ]),
      'Thank you for choosing SolarJi.',
    ].join('\n'),
  });

  return { sent: true };
}

module.exports = { sendComplaintConfirmation, isMailConfigured };

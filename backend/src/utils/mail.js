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
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
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

function leadStageEmailHtml({ lead, stage }) {
  const year = new Date().getFullYear();

  let badgeText = '';
  let headline = '';
  let mainText = '';
  let nextSteps = '';

  if (stage === 'Filing') {
    badgeText = 'Application Filing Completed';
    headline = 'Solar Application Filing Successful';
    mainText = `Dear <strong>${lead.name}</strong>,<br/><br/>We are pleased to inform you that your solar rooftop application filing and documentation have been successfully compiled and submitted to the grid authorities by SolarJi.`;
    nextSteps = 'Our engineering & compliance team will monitor the filing progress and coordinate the necessary site inspections.';
  } else if (stage === 'Loan Process') {
    badgeText = 'Loan Processing Active';
    headline = 'Solar Financing in Progress';
    mainText = `Dear <strong>${lead.name}</strong>,<br/><br/>Great news! Your solar financing application is now actively being processed with our banking partners. SolarJi is working to ensure smooth verification and quick loan approval for your system.`;
    nextSteps = 'Our finance desk will coordinate directly with the bank to complete sanction and loan release procedures.';
  } else if (stage === 'Commission') {
    badgeText = 'System Commissioned & Live';
    headline = 'Congratulations! Your Solar System is Live';
    mainText = `Dear <strong>${lead.name}</strong>,<br/><br/>We are delighted to celebrate this milestone with you! Your solar rooftop project has been fully installed, tested, and commissioned. You are now generating clean, sustainable solar power!`;
    nextSteps = 'Welcome to the green energy movement! Our customer care team will remain available for routine monitoring and support.';
  }

  const detailsRows = `
    <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;">
      <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;">Customer Name</p>
      <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:${BLACK};">${lead.name}</p>
    </td></tr>
    <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;">
      <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;">Phone Number</p>
      <p style="margin:4px 0 0;font-size:14px;color:#374151;">${lead.phone}</p>
    </td></tr>
    ${lead.systemSize ? `
    <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;">
      <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;">System Size</p>
      <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#374151;">${lead.systemSize}</p>
    </td></tr>` : ''}
    ${lead.city ? `
    <tr><td style="padding:14px 20px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;">Location</p>
      <p style="margin:4px 0 0;font-size:14px;color:#374151;">${lead.city}</p>
    </td></tr>` : ''}
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${headline} — SolarJi</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.08);">
          <tr>
            <td style="background:${BLACK};padding:28px 32px;border-bottom:4px solid ${ORANGE};">
              <p style="margin:0;font-size:26px;font-weight:900;color:${ORANGE};letter-spacing:-.02em;">SolarJi</p>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.65);">Shakya Consultants · Solar Energy Solutions</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:.08em;">${badgeText}</p>
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:${BLACK};line-height:1.3;">${headline}</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
                ${mainText}
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafafa;border:1px solid #eee;border-radius:12px;margin-bottom:24px;">
                ${detailsRows}
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin-bottom:24px;">
                <tr><td style="padding:16px 20px;">
                  <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;">What Happens Next?</p>
                  <p style="margin:0;font-size:14px;color:#78350f;line-height:1.5;">${nextSteps}</p>
                </td></tr>
              </table>

              <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
                If you have any questions, feel free to reply to this email or reach out to your SolarJi project advisor.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#fafafa;border-top:1px solid #eee;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">© ${year} SolarJi · Shakya Consultants · All rights reserved</p>
              <p style="margin:6px 0 0;font-size:11px;color:#d1d5db;">This is an automated notification regarding your solar installation status.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendLeadStageNotification(lead, stage) {
  if (!lead || !lead.email) {
    console.warn(`No email found for lead ${lead?._id} — skipping stage notification`);
    return { sent: false, reason: 'no_lead_email' };
  }

  if (!['Filing', 'Loan Process', 'Commission'].includes(stage)) {
    return { sent: false, reason: 'stage_not_notified' };
  }

  if (!isMailConfigured()) {
    console.warn(`SMTP not configured — skipping stage email (${stage}) for ${lead.email}`);
    return { sent: false, reason: 'smtp_not_configured' };
  }

  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const subjectMap = {
      'Filing': `Application Filing Submitted — ${lead.name} | SolarJi`,
      'Loan Process': `Solar Loan Financing in Progress — ${lead.name} | SolarJi`,
      'Commission': `🎉 Solar System Commissioned & Live! — ${lead.name} | SolarJi`,
    };

    const html = leadStageEmailHtml({ lead, stage });
    const transport = createTransport();

    await transport.sendMail({
      from: `"SolarJi Team" <${from}>`,
      to: lead.email,
      subject: subjectMap[stage] || `Lead Update: ${stage} | SolarJi`,
      html,
      text: `Dear ${lead.name},\n\nYour solar project status has been updated to: ${stage}.\n\nThank you for choosing SolarJi.`,
    });

    return { sent: true };
  } catch (err) {
    console.error('Error sending stage notification email:', err);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendComplaintConfirmation, sendLeadStageNotification, isMailConfigured };

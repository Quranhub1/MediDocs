/**
 * MediDocs Google Apps Script email gateway.
 *
 * 1. Create a Google Apps Script project.
 * 2. Paste this file into Code.gs.
 * 3. Run setSecret() once and replace the placeholder secret.
 * 4. Deploy as Web app, execute as you, and allow access to anyone.
 * 5. Put the deployed /exec URL and the same secret in Render:
 *    GOOGLE_APPS_SCRIPT_URL
 *    GOOGLE_APPS_SCRIPT_SECRET
 */

const SECRET_PROPERTY = 'MEDIDOCS_WEBHOOK_SECRET';

function setSecret() {
  // Replace this value once, run the function, then remove the literal secret from this file.
  PropertiesService.getScriptProperties().setProperty(SECRET_PROPERTY, 'REPLACE_WITH_A_LONG_RANDOM_SECRET');
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const expectedSecret = PropertiesService.getScriptProperties().getProperty(SECRET_PROPERTY);

    if (!expectedSecret || body.secret !== expectedSecret) {
      return jsonResponse({ success: false, error: 'Unauthorized' });
    }

    if (body.action !== 'sendEmail') {
      return jsonResponse({ success: false, error: 'Unsupported action' });
    }

    const to = String(body.to || '').trim();
    const subject = String(body.subject || '').trim();
    const message = String(body.message || '').trim();

    if (!to || !subject || !message) {
      return jsonResponse({ success: false, error: 'Missing required email fields' });
    }

    // Keep the recipient allow-list here as a second layer of protection.
    const allowedRecipients = [
      'kaigwaakram123@gmail.com'
    ];

    if (allowedRecipients.indexOf(to) === -1) {
      return jsonResponse({ success: false, error: 'Recipient not allowed' });
    }

    const eventType = String(body.eventType || '').trim();
    const userEmail = String(body.userEmail || '').trim();
    const userName = String(body.userName || '').trim();

    const htmlBody = buildHtmlEmail(subject, message, eventType, userEmail, userName);

    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: message,
      htmlBody: htmlBody,
      name: 'MediDocs'
    });

    return jsonResponse({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error(error);
    return jsonResponse({ success: false, error: 'Email delivery failed' });
  }
}

function buildHtmlEmail(subject, message, eventType, userEmail, userName) {
  return '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">' +
    '<div style="background:#059669;padding:20px;border-radius:8px 8px 0 0;text-align:center;">' +
    '<h1 style="color:white;margin:0;font-size:24px;">MediDocs Notification</h1>' +
    '</div>' +
    '<div style="background:#f9fafb;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;">' +
    '<h2 style="color:#059669;margin-top:0;">' + escapeHtml(subject) + '</h2>' +
    '<p style="font-size:16px;line-height:1.6;white-space:pre-wrap;">' + escapeHtml(message) + '</p>' +
    (eventType ? '<p><strong>Event:</strong> ' + escapeHtml(eventType) + '</p>' : '') +
    (userEmail ? '<p style="color:#6b7280;font-size:14px;"><strong>User Email:</strong> ' + escapeHtml(userEmail) + '</p>' : '') +
    (userName ? '<p style="color:#6b7280;font-size:14px;"><strong>User Name:</strong> ' + escapeHtml(userName) + '</p>' : '') +
    '<p style="color:#9ca3af;font-size:12px;margin-top:20px;">Sent automatically by MediDocs</p>' +
    '</div></div>';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

const Notification = require('../models/Notification');
const { sendMail } = require('./mailer');
const { notificationEmail } = require('./emailTemplates');

// Every place in the app that needs to tell a user something (a new message, a status
// change, a new applicant, etc.) calls this one function. It always does two things:
//   1. Writes a Notification document, which is what powers the bell icon.
//   2. Sends the same information by email over the existing SMTP setup.
// Email delivery is fire-and-forget (never awaited by the caller) so a slow or unreachable
// mail server never delays or breaks the action that triggered the notification.
async function notify({ recipientUserId, recipientEmail, recipientName, type, title, body, link }) {
  try {
    await Notification.create({ recipient: recipientUserId, type, title, body, link: link || '' });
  } catch (err) {
    // A failed notification write should never take down the action that triggered it
    // (e.g. submitting an application) — log and move on.
    console.error('Failed to create in-app notification:', err.message);
  }

  if (recipientEmail) {
    const { subject, html } = notificationEmail({ fullName: recipientName, title, body, link });
    sendMail({ to: recipientEmail, subject, html });
  }
}

// For events that already have their own polished, purpose-built email template (new
// application received, application status changed) — this only writes the Notification
// document so the bell picks it up too, without duplicating or replacing that existing email.
async function createInAppNotification({ recipientUserId, type, title, body, link }) {
  try {
    await Notification.create({ recipient: recipientUserId, type, title, body, link: link || '' });
  } catch (err) {
    console.error('Failed to create in-app notification:', err.message);
  }
}

module.exports = { notify, createInAppNotification };

const nodemailer = require("nodemailer");

let transporter = null;

const getMailConfig = () => {
  const provider = String(
    process.env.MAIL_PROVIDER || "gmail"
  ).toLowerCase();

  const host = String(
    process.env.SMTP_HOST || "smtp.gmail.com"
  ).trim();

  const port = Number(process.env.SMTP_PORT || 587);

  const user = String(
    process.env.SMTP_USER || ""
  ).trim();

  const pass = /gmail\.com$/i.test(host)
    ? String(process.env.SMTP_PASS || "").replace(/\s+/g, "")
    : String(process.env.SMTP_PASS || "");

  const from = String(
    process.env.SMTP_FROM || user
  ).trim();

  return {
    provider,
    host,
    port,
    user,
    pass,
    from,
    secure: port === 465,
  };
};

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const config = getMailConfig();

  if (!config.user || !config.pass) {
    console.error(
      "[ASIATECH SYNC] SMTP configuration is incomplete."
    );

    return null;
  }

  console.log(
    `[ASIATECH SYNC] SMTP: ${config.host}:${config.port}`
  );

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.port === 587,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return transporter;
};

const verifyMailConnection = async () => {
  const t = getTransporter();

  if (!t) {
    return {
      success: false,
      error: "SMTP credentials are not configured.",
    };
  }

  try {
    await t.verify();

    console.log(
      "[ASIATECH SYNC] SMTP connection verified."
    );

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "[ASIATECH SYNC] SMTP verification failed:",
      error.message
    );

    return {
      success: false,
      error: error.message,
    };
  }
};

const isMailUnavailableError = (error) => {
  const message = String(
    error?.message || error || ""
  );

  if (!message) {
    return false;
  }

  const patterns = [
    /daily user sending limit exceeded/i,
    /sending limit exceeded/i,
    /mail quota exceeded/i,
    /too many messages/i,
    /rate limit/i,
    /temporar(?:y|ily) unavailable/i,
    /service unavailable/i,
    /\b421\b/i,
    /\b450\b/i,
    /\b451\b/i,
    /\b452\b/i,
    /\b454\b/i,
    /\b455\b/i,
    /ECONNRESET/i,
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
    /ENETUNREACH/i,
  ];

  return patterns.some((pattern) =>
    pattern.test(message)
  );
};

const sendMail = async ({
  to,
  subject,
  html,
  attachments,
  allowDevOverride = false,
}) => {
  let targetTo = to;
  let targetSubject = subject;
  let targetHtml = html;

  const devOverride = String(
    process.env.DEV_EMAIL_OVERRIDE || ""
  ).trim();

  const redirectEnabled =
    process.env.DEV_EMAIL_REDIRECT === "true";

  if (
    devOverride &&
    allowDevOverride &&
    redirectEnabled &&
    process.env.NODE_ENV !== "production"
  ) {
    const originalRecipient = Array.isArray(to)
      ? to.join(", ")
      : to;

    targetTo = devOverride;

    targetSubject =
      `[DEV to: ${originalRecipient}] ${subject}`;

    targetHtml = `
      <div
        style="
          background:#fef3c7;
          border:1px solid #f59e0b;
          padding:10px 14px;
          margin-bottom:18px;
          border-radius:8px;
          font-family:sans-serif;
          font-size:13px;
          color:#92400e;
        "
      >
        <strong>[DEV EMAIL REDIRECT]</strong>
        Originally addressed to:
        <code>${originalRecipient}</code>
      </div>
      ${html}
    `;

    console.log(
      `[ASIATECH SYNC] Email redirected: ${originalRecipient} → ${devOverride}`
    );
  }

  const t = getTransporter();

  if (!t) {
    return {
      sent: false,
      skipped: true,
      unavailable: false,
      error: "SMTP credentials are not configured.",
      message:
        "Email service is not configured.",
    };
  }

  const config = getMailConfig();

  try {
    const fromAddress = config.from || config.user;

    const info = await t.sendMail({
      from: `"ASIATECH SYNC" <${fromAddress}>`,
      to: targetTo,
      subject: targetSubject,
      html: targetHtml,
      attachments: attachments || [],
    });

    const accepted = info.accepted || [];
    const rejected = info.rejected || [];

    console.log(
      `[ASIATECH SYNC] Email processed for ${targetTo}. ` +
      `Message ID: ${info.messageId || "unknown"}; ` +
      `Accepted: ${accepted.length}; ` +
      `Rejected: ${rejected.length}`
    );

    const recipients = Array.isArray(targetTo)
      ? targetTo
      : [targetTo];

    const allAccepted = recipients.every(
      (recipient) =>
        accepted.includes(recipient)
    );

    if (!allAccepted) {
      return {
        sent: false,
        unavailable: false,
        error:
          "SMTP did not accept the recipient.",
        messageId: info.messageId,
        accepted,
        rejected,
      };
    }

    return {
      sent: true,
      messageId: info.messageId,
      accepted,
      rejected,
    };
  } catch (error) {
    const unavailable =
      isMailUnavailableError(error);

    console.error(
      `[ASIATECH SYNC] Failed to send email to ${targetTo}:`,
      error.message
    );

    return {
      sent: false,
      unavailable,
      error: error.message,
      message: unavailable
        ? "Email delivery is temporarily unavailable. Please try again later."
        : error.message,
    };
  }
};

module.exports = {
  sendMail,
  isMailUnavailableError,
  verifyMailConnection,
};

For Railway, keep:

MAIL_PROVIDER=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourgmail@gmail.com
SMTP_PASS=your_google_app_password
SMTP_FROM=yourgmail@gmail.com

This version removes the Resend code and keeps the SMTP implementation focused.

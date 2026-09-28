const nodemailer = require("nodemailer");
const { Resend } = require("resend");

// Shared email client for automated mail. Prefers the modern Resend REST API when
// RESEND_API_KEY is configured, and seamlessly falls back to standard SMTP (Gmail,
// custom SMTP, or smtp.resend.com) if not.
let transporter = null;
let resendClient = null;

const getResendClient = () => {
  if (resendClient) return resendClient;
  if ((process.env.MAIL_PROVIDER || "").toLowerCase() === "gmail") {
    return null;
  }
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (apiKey) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
};

const isMailUnavailableError = (error) => {
  const message = String(error?.message || error || "");
  if (!message) return false;

  const patterns = [
    /daily user sending limit exceeded/i,
    /sending limit exceeded/i,
    /mail quota exceeded/i,
    /too many messages/i,
    /rate limit/i,
    /temporar(?:y|ily) unavailable/i,
    /service unavailable/i,
    /421\b|450\b|451\b|452\b|454\b|455\b/i,
    /exceeded.*limit/i,
  ];

  return patterns.some((pattern) => pattern.test(message));
};

const getMailConfig = () => {
  const provider = (process.env.MAIL_PROVIDER || "custom-smtp").toLowerCase();
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port =
    Number(process.env.SMTP_PORT) || (provider === "gmail" ? 465 : 587);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";

  return {
    provider,
    host,
    port,
    user,
    pass: /gmail\.com$/i.test(host) ? pass.replace(/\s+/g, "") : pass,
    secure: port === 465,
    recommendsCustomProvider: provider !== "gmail",
  };
};

const getTransporter = () => {
  if (transporter) return transporter;

  const config = getMailConfig();

  if (!config.user || !config.pass) {
    return null;
  }

  if (config.host.includes("gmail.com") || config.provider === "gmail") {
    console.warn(
      "[ASIATECH SYNC] Gmail SMTP is configured. This is convenient for testing, but Gmail enforces daily sending limits and can block OTP/password-reset emails in production.",
    );
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
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

  // Development redirection is opt-in. A configured test inbox alone must never silently
  // divert OTP or password-reset messages away from the account that requested them.
  const devOverride = String(process.env.DEV_EMAIL_OVERRIDE || "").trim();
  const redirectEnabled = process.env.DEV_EMAIL_REDIRECT === "true";
  if (
    devOverride &&
    allowDevOverride &&
    redirectEnabled &&
    process.env.NODE_ENV !== "production"
  ) {
    const originalRecipient = Array.isArray(to) ? to.join(", ") : to;
    targetTo = devOverride;
    targetSubject = `[DEV to: ${originalRecipient}] ${subject}`;
    targetHtml = `
      <div style="background:#fef3c7;border:1px solid #f59e0b;padding:10px 14px;margin-bottom:18px;border-radius:8px;font-family:sans-serif;font-size:13px;color:#92400e;">
        <strong>[DEV EMAIL REDIRECT]</strong> This email was originally addressed to: <code>${originalRecipient}</code>
      </div>
      ${html}
    `;
    console.log(
      `[ASIATECH SYNC] DEV_EMAIL_OVERRIDE active: redirecting email for "${originalRecipient}" to "${devOverride}"`,
    );
  }

  // 1. Prefer Resend API if configured
  const resend = getResendClient();
  if (resend) {
    try {
      const fromAddress =
        process.env.RESEND_FROM ||
        process.env.SMTP_FROM ||
        "ASIATECH SYNC <onboarding@resend.dev>";

      const formattedAttachments = attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        path: att.path,
      }));

      const response = await resend.emails.send({
        from: fromAddress,
        to: Array.isArray(targetTo) ? targetTo : [targetTo],
        subject: targetSubject,
        html: targetHtml,
        ...(formattedAttachments?.length
          ? { attachments: formattedAttachments }
          : {}),
      });

      if (response.error) {
        console.error(
          `[ASIATECH SYNC] Resend API error sending to ${targetTo}:`,
          response.error,
        );
        return {
          sent: false,
          unavailable: false,
          error: response.error.message || String(response.error),
          message: response.error.message,
        };
      }

      console.log(
        `[ASIATECH SYNC] Email sent via Resend API to ${targetTo} (id: ${response.data?.id})`,
      );
      return {
        sent: true,
        messageId: response.data?.id,
      };
    } catch (err) {
      console.error(
        `[ASIATECH SYNC] Exception sending email via Resend to ${targetTo}:`,
        err.message,
      );
      return {
        sent: false,
        unavailable: false,
        error: err.message,
        message: err.message,
      };
    }
  }

  // 2. Fall back to SMTP transporter
  const t = getTransporter();
  if (!t) {
    return {
      sent: false,
      skipped: true,
      unavailable: false,
      error: "Neither RESEND_API_KEY nor SMTP credentials are configured.",
    };
  }

  try {
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
    const info = await t.sendMail({
      from: `"ASIATECH SYNC" <${fromAddress}>`,
      to: targetTo,
      subject: targetSubject,
      html: targetHtml,
      attachments,
    });
    const accepted = info.accepted || [];
    const rejected = info.rejected || [];
    console.log(
      `[ASIATECH SYNC] Email accepted by SMTP for ${targetTo} (messageId: ${info.messageId || "unknown"}; accepted: ${accepted.length}; rejected: ${rejected.length})`,
    );
    if (!accepted.includes(targetTo)) {
      return {
        sent: false,
        unavailable: false,
        error: `SMTP did not accept recipient ${targetTo}.`,
        messageId: info.messageId,
      };
    }
    return {
      sent: true,
      messageId: info.messageId,
      accepted,
      rejected,
    };
  } catch (err) {
    const unavailable = isMailUnavailableError(err);
    console.error(
      `[ASIATECH SYNC] Failed to send email to ${targetTo}:`,
      err.message,
    );
    return {
      sent: false,
      unavailable,
      error: err.message,
      message: unavailable
        ? "Email delivery is temporarily unavailable. Please contact the admin office or try again later."
        : err.message,
    };
  }
};

module.exports = { sendMail, isMailUnavailableError };

const { Resend } = require("resend");

// ============================================================
// A-SYNC MAILER
// Resend API only
// ============================================================

let resendClient = null;

// ------------------------------------------------------------
// Resend client
// ------------------------------------------------------------

const getResendClient = () => {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = String(process.env.RESEND_API_KEY || "").trim();

  if (!apiKey) {
    return null;
  }

  resendClient = new Resend(apiKey);

  return resendClient;
};

// ------------------------------------------------------------
// Detect temporary email service errors
// ------------------------------------------------------------

const isMailUnavailableError = (error) => {
  const message = String(error?.message || error || "");

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
    /421\b|450\b|451\b|452\b|454\b|455\b/i,
    /exceeded.*limit/i,
  ];

  return patterns.some((pattern) => pattern.test(message));
};

// ------------------------------------------------------------
// Send email using Resend
// ------------------------------------------------------------

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

  // ----------------------------------------------------------
  // Development email override
  // ----------------------------------------------------------

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
        <br>
        This email was originally addressed to:
        <code>${originalRecipient}</code>
      </div>

      ${html}
    `;

    console.log(
      `[A-SYNC] DEV_EMAIL_OVERRIDE active: redirecting email for "${originalRecipient}" to "${devOverride}"`
    );
  }

  // ----------------------------------------------------------
  // Get Resend client
  // ----------------------------------------------------------

  const resend = getResendClient();

  if (!resend) {
    const error =
      "RESEND_API_KEY is not configured.";

    console.error(`[A-SYNC] ${error}`);

    return {
      sent: false,
      unavailable: false,
      error,
      message: error,
    };
  }

  // ----------------------------------------------------------
  // Verified sender
  // ----------------------------------------------------------

  const fromAddress =
    String(
      process.env.RESEND_FROM ||
        "A-Sync <no-reply@a-sync.online>"
    ).trim();

  // ----------------------------------------------------------
  // Format attachments
  // ----------------------------------------------------------

  const formattedAttachments = Array.isArray(attachments)
    ? attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        ...(att.path ? { path: att.path } : {}),
      }))
    : [];

  // ----------------------------------------------------------
  // Send through Resend
  // ----------------------------------------------------------

  try {
    console.log(
      `[A-SYNC] Sending email via Resend to ${targetTo}`
    );

    const response = await resend.emails.send({
      from: fromAddress,

      to: Array.isArray(targetTo)
        ? targetTo
        : [targetTo],

      subject: targetSubject,

      html: targetHtml,

      ...(formattedAttachments.length > 0
        ? {
            attachments: formattedAttachments,
          }
        : {}),
    });

    // --------------------------------------------------------
    // Resend returned an error
    // --------------------------------------------------------

    if (response?.error) {
      console.error(
        `[A-SYNC] Resend API error sending to ${targetTo}:`,
        response.error
      );

      return {
        sent: false,
        unavailable: isMailUnavailableError(
          response.error
        ),
        error:
          response.error.message ||
          String(response.error),
        message:
          response.error.message ||
          String(response.error),
      };
    }

    // --------------------------------------------------------
    // Success
    // --------------------------------------------------------

    const messageId = response?.data?.id || null;

    console.log(
      `[A-SYNC] Email sent successfully via Resend to ${targetTo}` +
        (messageId ? ` (id: ${messageId})` : "")
    );

    return {
      sent: true,
      messageId,
    };
  } catch (err) {
    const unavailable =
      isMailUnavailableError(err);

    console.error(
      `[A-SYNC] Resend failed to send email to ${targetTo}:`,
      err?.message || err
    );

    return {
      sent: false,
      unavailable,
      error: err?.message || String(err),
      message: unavailable
        ? "Email delivery is temporarily unavailable. Please try again later."
        : err?.message || String(err),
    };
  }
};

// ------------------------------------------------------------
// Exports
// ------------------------------------------------------------

module.exports = {
  sendMail,
  isMailUnavailableError,
};

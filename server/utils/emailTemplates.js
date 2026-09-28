// Email clients do not reliably load external CSS, so the system theme is kept inline.

// Every value below that ultimately comes from user input (names, job titles, cover
// notes, rejection reasons, etc.) is escaped before being interpolated into HTML email
// bodies. Without this, a student or company could put HTML/script markup in a profile
// field or free-text note and have it render as live markup in an email — to an admin,
// another company, or another student — instead of as plain text.
const escapeHtml = (value) =>
  value === undefined || value === null
    ? ""
    : String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const wrapper = (bodyHtml) => `
  <div style="background:#596869;padding:36px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#F7FBF7;border:1px solid #CFE0D3;border-radius:24px;overflow:hidden;box-shadow:0 18px 45px rgba(15,30,53,0.18);">
      <div style="background:#214C3F;padding:24px 30px;border-bottom:4px solid #A8D38D;">
        <span style="font-weight:800;font-size:20px;color:#FFFFFF;letter-spacing:0.4px;">ASIATECH <span style="color:#C4E1C1;">SYNC</span></span>
        <div style="margin-top:6px;color:#D8EBDD;font-size:12px;letter-spacing:1.6px;text-transform:uppercase;">Student and Industry Opportunities</div>
      </div>
      <div style="padding:30px;color:#0F1E35;">
        ${bodyHtml}
      </div>
      <div style="background:#214C3F;padding:18px 30px;color:#D8EBDD;font-size:12px;line-height:1.5;">
        This is an automated notification from ASIATECH SYNC. Please do not reply directly to this email.
      </div>
    </div>
  </div>
`;

// Sent to a company when a student submits an application to one of its job postings.
const newApplicationEmail = ({
  companyName,
  jobTitle,
  studentName,
  studentEmail,
  coverNote,
}) => ({
  subject: `New OJT Application: ${studentName} applied to "${jobTitle}"`,
  html: wrapper(`
    <h2 style="margin:0 0 12px;color:#1F2937;">New Applicant for ${escapeHtml(jobTitle)}</h2>
    <p style="margin:0 0 16px;line-height:1.5;color:#1F2937;">Hi ${escapeHtml(companyName)},</p>
    <p style="margin:0 0 16px;line-height:1.5;color:#1F2937;">
      <strong>${escapeHtml(studentName)}</strong> (${escapeHtml(studentEmail)}) just applied to your posting
      <strong>${escapeHtml(jobTitle)}</strong>. Their resume is attached to this email, and their full
      profile is available from your Company Portal.
    </p>
    ${
      coverNote
        ? `<div style="background:#D1F4E0;border:1px solid rgba(52,199,89,0.3);border-radius:8px;padding:14px 16px;margin:0 0 16px;font-style:italic;color:#047857;">"${escapeHtml(coverNote)}"</div>`
        : ""
    }
    <p style="margin:0;line-height:1.5;color:#1F2937;">Log in to review this applicant and update their status.</p>
  `),
});

const STATUS_COPY = {
  in_review: {
    label: "In Review",
    color: "#5D8F76",
    message: "is now being reviewed by the hiring team",
  },
  approved: {
    label: "Approved",
    color: "#5D8F76",
    message:
      "has been approved! Congratulations — expect next steps and interview details soon",
  },
  declined: {
    label: "Declined",
    color: "#F05B50",
    message: "was not selected for this posting this time",
  },
};

// Sent to a student whenever a company updates their application status.
const applicationStatusEmail = ({
  studentName,
  jobTitle,
  companyName,
  status,
  note,
}) => {
  const copy = STATUS_COPY[status] || {
    label: status,
    color: "#5D8F76",
    message: "has been updated",
  };
  return {
    subject: `Application Update: ${jobTitle} at ${companyName} — ${copy.label}`,
    html: wrapper(`
      <h2 style="margin:0 0 12px;color:#214C3F;">Your Application Status Changed</h2>
      <p style="margin:0 0 16px;line-height:1.5;color:#1F2937;">Hi ${escapeHtml(studentName)},</p>
      <p style="margin:0 0 16px;line-height:1.5;color:#1F2937;">
        Your application for <strong>${escapeHtml(jobTitle)}</strong> at <strong>${escapeHtml(companyName)}</strong>
        ${copy.message}.
      </p>
      <div style="display:inline-block;background:${copy.color};color:#FFFFFF;font-weight:700;
        padding:8px 16px;border-radius:999px;font-size:13px;margin:0 0 16px;">
        ${copy.label}
      </div>
      ${
        note
          ? `<div style="background:#D1F4E0;border-radius:8px;padding:14px 16px;margin:0 0 16px;color:#047857;">${escapeHtml(note)}</div>`
          : ""
      }
      <p style="margin:0;line-height:1.5;color:#1F2937;">Log in to ASIATECH SYNC to see the full details.</p>
    `),
  };
};

// Sent when someone requests a password reset — a one-time, 10-minute 6-digit code.
const passwordResetEmail = ({ fullName, code }) => ({
  subject: "Your ASIATECH SYNC password reset code",
  html: wrapper(`
    <h2 style="margin:0 0 12px;color:#214C3F;font-size:24px;">Reset Your Password</h2>
    <p style="margin:0 0 16px;line-height:1.5;color:#0F1E35;">Hi ${escapeHtml(fullName)},</p>
    <p style="margin:0 0 16px;line-height:1.5;color:#0F1E35;">
      We received a request to reset your ASIATECH SYNC password. Enter this code on the
      reset page to continue. It expires in 10 minutes.
    </p>
    <div style="text-align:center;background:#FFF7DC;border:1px solid #E8C95A;
      border-radius:10px;padding:18px;margin:0 0 16px;">
      <span style="font-size:32px;font-weight:800;letter-spacing:10px;color:#214C3F;">${code}</span>
    </div>
    <p style="margin:0;line-height:1.5;color:#596869;font-size:13px;">
      If you didn't request this, you can safely ignore this email — your password won't change.
    </p>
  `),
});

const studentMonthlyOtpEmail = ({ fullName, code }) => ({
  subject: "Your ASIATECH SYNC monthly login code",
  html: wrapper(`
    <h2 style="margin:0 0 12px;color:#1F2937;">Your Monthly Login Code</h2>
    <p style="margin:0 0 16px;line-height:1.5;color:#1F2937;">Hi ${escapeHtml(fullName)},</p>
    <p style="margin:0 0 16px;line-height:1.5;color:#1F2937;">Use this code whenever you log in during this month. Save it securely or take a picture of it. Do not share it with anyone.</p>
    <div style="text-align:center;background:#D1F4E0;border:1px solid rgba(52,199,89,0.3);border-radius:10px;padding:18px;margin:0 0 16px;"><span style="font-size:32px;font-weight:800;letter-spacing:10px;color:#047857;">${code}</span></div>
    <p style="margin:0;line-height:1.5;color:#4B5563;font-size:13px;">This code is valid until the end of this calendar month.</p>
  `),
});

// Generic template for bell-notification events that don't have their own dedicated email
// (new messages, document verification updates). `link` is a relative client path.
const notificationEmail = ({ fullName, title, body, link }) => ({
  subject: `${title} — ASIATECH SYNC`,
  html: wrapper(`
    <h2 style="margin:0 0 12px;color:#214C3F;font-size:24px;">${escapeHtml(title)}</h2>
    <p style="margin:0 0 16px;line-height:1.5;color:#0F1E35;">Hi ${escapeHtml(fullName) || "there"},</p>
    ${body ? `<p style="margin:0 0 20px;line-height:1.5;color:#0F1E35;">${escapeHtml(body)}</p>` : ""}
    ${
      link
        ? `<a href="${escapeHtml(process.env.CLIENT_URL || "http://localhost:3000")}${escapeHtml(link)}" style="display:inline-block;background:#DFEECF;color:#214C3F;font-weight:700;
      padding:10px 22px;border-radius:999px;text-decoration:none;">
      View in ASIATECH SYNC
    </a>`
        : ""
    }
  `),
});

// Sent to admin when a new company registers and requires verification
const adminNewCompanySignupEmail = ({
  companyName,
  contactPerson,
  contactEmail,
}) => ({
  subject: `[ADMIN] New Company Registration: ${companyName}`,
  html: wrapper(`
    <h2 style="margin:0 0 12px;color:#214C3F;">New Company Awaiting Verification</h2>
    <p style="margin:0 0 16px;line-height:1.5;color:#1F2937;">Hi Admin,</p>
    <p style="margin:0 0 16px;line-height:1.5;color:#1F2937;">
      A new company has registered on ASIATECH SYNC and is awaiting your verification:
    </p>
    <div style="background:#EDF7DF;border-left:4px solid #5D8F76;padding:16px;margin:0 0 16px;border-radius:4px;">
      <p style="margin:0 0 8px;color:#1F2937;"><strong>Company Name:</strong> ${escapeHtml(companyName)}</p>
      <p style="margin:0 0 8px;color:#1F2937;"><strong>Contact Person:</strong> ${escapeHtml(contactPerson)}</p>
      <p style="margin:0;color:#1F2937;"><strong>Email:</strong> ${escapeHtml(contactEmail)}</p>
    </div>
    <p style="margin:0 0 16px;line-height:1.5;color:#1F2937;">
      Review their details and approve or reject their account from the Manage Companies page.
    </p>
    <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/admin/companies" style="display:inline-block;background:#DFEECF;color:#214C3F;font-weight:700;padding:10px 22px;border-radius:999px;text-decoration:none;">
      Review in Admin Panel
    </a>
  `),
});

// Sent to the official ASIATECH SYNC inbox when an admin creates a student or coordinator.
const adminNewAccountEmail = ({ role, fullName, email, details }) => ({
  subject: `[ADMIN] New ${role} Account Created: ${fullName}`,
  html: wrapper(`
    <h2 style="margin:0 0 12px;color:#214C3F;">New ${escapeHtml(role)} Account Created</h2>
    <p style="margin:0 0 16px;line-height:1.5;color:#1F2937;">A new ${escapeHtml(String(role).toLowerCase())} account was created in ASIATECH SYNC.</p>
    <div style="background:#EDF7DF;border-left:4px solid #5D8F76;padding:16px;margin:0 0 16px;border-radius:4px;">
      <p style="margin:0 0 8px;color:#1F2937;"><strong>Name:</strong> ${escapeHtml(fullName)}</p>
      <p style="margin:0 0 8px;color:#1F2937;"><strong>Email:</strong> ${escapeHtml(email)}</p>
      ${details ? `<p style="margin:0;color:#1F2937;"><strong>Details:</strong> ${escapeHtml(details)}</p>` : ""}
    </div>
  `),
});

// Sent to admin when they approve a company account
const adminCompanyApprovedEmail = ({ companyName, approvedAt }) => ({
  subject: `[ADMIN] Company Approved: ${companyName}`,
  html: wrapper(`
    <h2 style="margin:0 0 12px;color:#1F2937;">Company Account Approved</h2>
    <p style="margin:0 0 16px;line-height:1.5;color:#1F2937;">Hi Admin,</p>
    <p style="margin:0 0 16px;line-height:1.5;color:#1F2937;">
      You have successfully approved <strong>${escapeHtml(companyName)}</strong>. Their account is now active and they can begin posting job opportunities.
    </p>
    <div style="background:#EDF7DF;border-left:4px solid #5D8F76;padding:16px;margin:0 0 16px;border-radius:4px;">
      <p style="margin:0;color:#047857;"><strong>Approved at:</strong> ${new Date(approvedAt).toLocaleString()}</p>
    </div>
  `),
});

// Sent to admin when they reject a company account
const adminCompanyRejectedEmail = ({
  companyName,
  rejectionReason,
  rejectedAt,
}) => ({
  subject: `[ADMIN] Company Rejected: ${companyName}`,
  html: wrapper(`
    <h2 style="margin:0 0 12px;color:#1F2937;">Company Account Rejected</h2>
    <p style="margin:0 0 16px;line-height:1.5;color:#1F2937;">Hi Admin,</p>
    <p style="margin:0 0 16px;line-height:1.5;color:#1F2937;">
      You have rejected the account for <strong>${escapeHtml(companyName)}</strong>.
    </p>
    ${
      rejectionReason
        ? `<div style="background:#FEE2E2;border-left:4px solid #F05B50;padding:16px;margin:0 0 16px;border-radius:4px;">
      <p style="margin:0;color:#7F1D1D;"><strong>Reason:</strong> ${escapeHtml(rejectionReason)}</p>
    </div>`
        : ""
    }
    <p style="margin:0;line-height:1.5;color:#1F2937;"><strong>Rejected at:</strong> ${new Date(rejectedAt).toLocaleString()}</p>
  `),
});

module.exports = {
  newApplicationEmail,
  applicationStatusEmail,
  passwordResetEmail,
  studentMonthlyOtpEmail,
  notificationEmail,
  adminNewCompanySignupEmail,
  adminNewAccountEmail,
  adminCompanyApprovedEmail,
  adminCompanyRejectedEmail,
};

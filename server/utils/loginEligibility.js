const STUDENT_EMAIL_DOMAIN = "asiatech.edu.ph";

const normalizeEmail = (email = "") =>
  String(email || "")
    .trim()
    .toLowerCase();

const validatePortalAccess = ({ user, email, portal, companyProfile }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!portal) {
    return { ok: true };
  }

  if (portal === "student") {
    if (!normalizedEmail.endsWith(`@${STUDENT_EMAIL_DOMAIN}`)) {
      return {
        ok: false,
        status: 403,
        message:
          "Student accounts must use a registered @asiatech.edu.ph email.",
      };
    }

    if (!user) {
      return {
        ok: false,
        status: 403,
        message:
          "This student account is not registered yet. Please contact the admin office.",
      };
    }

    if (user.role !== "student") {
      return {
        ok: false,
        status: 403,
        message:
          "This account is not registered as a student. Please use the correct login tab.",
      };
    }

    if (!user.isActive || user.isArchived) {
      return {
        ok: false,
        status: 403,
        message: "This account has been disabled. Contact an administrator.",
      };
    }

    return { ok: true };
  }

  if (portal === "company") {
    if (!user) {
      return {
        ok: false,
        status: 403,
        message:
          "No company account is registered for this email. Create an account or contact the admin office.",
      };
    }

    if (user.role !== "company") {
      return {
        ok: false,
        status: 403,
        message:
          "This account is not registered as a company. Please use the correct login tab.",
      };
    }

    if (!user.isActive || user.isArchived) {
      return {
        ok: false,
        status: 403,
        message: "This account has been disabled. Contact an administrator.",
      };
    }

    if (!companyProfile || !companyProfile.isVerified) {
      return {
        ok: false,
        status: 403,
        message:
          "Your company account is pending admin verification. You can log in once it has been approved.",
      };
    }

    return { ok: true };
  }

  return { ok: true };
};

module.exports = {
  STUDENT_EMAIL_DOMAIN,
  normalizeEmail,
  validatePortalAccess,
};

const express = require("express");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const CompanyProfile = require("../models/CompanyProfile");
const generateToken = require("../utils/generateToken");
const { protect } = require("../middleware/auth");
const { sendMail } = require("../utils/mailer");
const {
  passwordResetEmail,
  adminNewCompanySignupEmail,
  adminNewAccountEmail,
  studentMonthlyOtpEmail,
} = require("../utils/emailTemplates");
const { createInAppNotification } = require("../utils/notify");
const { recordAudit } = require("../utils/securityAudit");
const { getPhilippineMonthString } = require("../utils/philippineTime");
const { validatePortalAccess } = require("../utils/loginEligibility");
const upload = require("../middleware/upload");
const scanUploadedFile = require("../middleware/scanUpload");
const { persistUpload, renameUpload } = require("../utils/persistUpload");

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Self-registration is for company (employer) accounts only. Student accounts are
//          created by an administrator (see POST /api/admin/students) using an
//          @asiatech.edu.ph email, so they never go through this public endpoint. Admin
//          accounts are seeded, not self-registered.
router.post(
  "/register",
  upload.uploadLogo.single("logo"),
  scanUploadedFile,
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required."),
    body("email").isEmail().withMessage("A valid email is required."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),
    body("role")
      .equals("company")
      .withMessage("Public sign-up is available for company accounts only."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.body.role === "student") {
        return res.status(400).json({
          message:
            "Student accounts are created by your school administrator using your @asiatech.edu.ph email. Please contact the admin office to get your login.",
        });
      }
      return res
        .status(400)
        .json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    try {
      const { fullName, email, password, companyName } = req.body;

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res
          .status(409)
          .json({ message: "An account with this email already exists." });
      }

      if (!companyName) {
        return res
          .status(400)
          .json({ message: "Company name is required for company accounts." });
      }

      const user = await User.create({
        fullName,
        email,
        password,
        role: "company",
      });
      const profile = await CompanyProfile.create({
        user: user._id,
        companyName,
      });
      if (req.file) {
        await renameUpload(req.file, companyName);
        profile.companyUploadedLogo = await persistUpload(req.file, {
          folder: "company-logos",
        });
        await profile.save();
      }

      const admins = await User.find({ role: "admin", isActive: true }).select(
        "_id email fullName",
      );
      const officialAdminEmail =
        process.env.SMTP_USER || process.env.ADMIN_EMAIL;

      await Promise.all(
        admins.map((admin) =>
          createInAppNotification({
            recipientUserId: admin._id,
            type: "company_verification_pending",
            title: "New company awaiting verification",
            body: `${fullName} registered ${companyName} and is waiting for admin approval.`,
            link: "/admin/companies",
          }),
        ),
      );
      await sendMail({
        to: officialAdminEmail,
        ...adminNewCompanySignupEmail({
          companyName,
          contactPerson: fullName,
          contactEmail: email,
        }),
      });

      // No token here on purpose: a company account isn't usable until an admin verifies
      // it (see the isVerified check in /login below), so there's no session to start yet.
      res.status(201).json({
        pendingVerification: true,
        message:
          "Your company account has been created. An administrator needs to verify it before you can log in — you will be notified once approved.",
      });
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.email) {
        return res
          .status(409)
          .json({ message: "An account with this email already exists." });
      }
      res.status(500).json({
        message: "Registration failed.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

// @route   POST /api/auth/login
// @desc    The login screen has a Student / Company / Admin portal selector. `portal` tells
//          the server which tab the person used, so an account can never log in through the
//          wrong door — e.g. a student's credentials are rejected on the Admin portal even if
//          they're otherwise correct. The Admin portal accepts both admin and coordinator
//          accounts, since coordinators live inside the same admin section (read-only).
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("A valid email is required."),
    body("password").notEmpty().withMessage("Password is required."),
    body("otp")
      .optional({ checkFalsy: true })
      .matches(/^\d{6}$/)
      .withMessage("Enter the 6-digit monthly login code."),
    body("portal")
      .optional()
      .isIn(["student", "company", "admin", "coordinator", "registrar"])
      .withMessage("Invalid portal."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const { email, password, portal, otp } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() }).select(
        "+password +monthlyOtpHash +monthlyOtpMonth +failedLoginAttempts +loginLockedUntil",
      );

      const now = Date.now();
      if (user?.loginLockedUntil && user.loginLockedUntil > now) {
        await recordAudit(req, {
          action: "login",
          outcome: "blocked",
          user,
          details: "Account temporarily locked",
        });
        return res.status(429).json({
          message:
            "Too many login attempts. Try again in 5 minutes, or reset your password to regain access.",
        });
      }

      const registerFailure = async (message) => {
        if (user) {
          user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
          if (user.failedLoginAttempts >= 3) {
            user.loginLockedUntil = new Date(Date.now() + 5 * 60 * 1000);
          }
          await user.save();
        }
        await recordAudit(req, {
          action: "login",
          outcome: "failure",
          user,
          email,
          details: message,
        });
        if (user?.loginLockedUntil) {
          return res.status(429).json({
            message:
              "Too many login attempts. Try again in 5 minutes, or reset your password to regain access.",
          });
        }
        return res.status(401).json({ message });
      };

      if (!user || !(await user.comparePassword(password))) {
        return registerFailure("Invalid email or password.");
      }

      if (!user.isActive) {
        return res.status(403).json({
          message: "This account has been disabled. Contact an administrator.",
        });
      }

      if (user.role === "company") {
        const companyProfile = await CompanyProfile.findOne({ user: user._id });
        if (!companyProfile || !companyProfile.isVerified) {
          return res.status(403).json({
            message:
              "Your company account is pending admin verification. You can log in once it has been approved.",
          });
        }
      }

      if (portal) {
        const allowedRoles = portal === "admin" ? ["admin"] : [portal];
        if (!allowedRoles.includes(user.role)) {
          return res.status(403).json({
            message:
              portal === "admin"
                ? "This account does not have admin access."
                : `This account is not registered as a ${portal}. Please use the correct login tab.`,
          });
        }
      }

      if (user.role === "student") {
        const month = getPhilippineMonthString();
        if (!user.monthlyOtpHash || user.monthlyOtpMonth !== month) {
          const monthlyCode = crypto.randomInt(100000, 1000000).toString();
          user.monthlyOtpHash = crypto
            .createHash("sha256")
            .update(monthlyCode)
            .digest("hex");
          user.monthlyOtpMonth = month;
          const result = await sendMail({
            to: user.email,
            ...studentMonthlyOtpEmail({
              fullName: user.fullName,
              code: monthlyCode,
            }),
          });
          if (result.sent === false) {
            return res.status(502).json({
              message:
                "Unable to send the OTP email. Please contact an administrator.",
            });
          }
          await user.save();
          await recordAudit(req, {
            action: "student_otp_issued",
            outcome: "success",
            user,
            details: `Monthly code issued for ${month}`,
          });
          return res.status(401).json({
            otpRequired: true,
            message:
              "A monthly login code was sent to your school email. Save it securely or take a picture of it and enter it to continue.",
          });
        }
        if (
          !otp ||
          crypto.createHash("sha256").update(otp).digest("hex") !==
            user.monthlyOtpHash
        ) {
          return registerFailure("Invalid monthly login code.");
        }
      }

      user.lastLoginAt = new Date();
      user.failedLoginAttempts = 0;
      user.loginLockedUntil = undefined;
      await user.save();

      const token = generateToken(user._id, user.role);
      await recordAudit(req, {
        action: "login",
        outcome: "success",
        user,
        details: "Authenticated successfully",
      });
      res.json({ token, user: user.toSafeObject() });
    } catch (err) {
      res.status(500).json({
        message: "Login failed.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

// @route   POST /api/auth/send-otp
// @desc    Sends or refreshes the current month's student login OTP after password verification.
router.post(
  "/send-otp",
  [
    body("email").isEmail().withMessage("A valid email is required."),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const email = req.body.email.toLowerCase();
      const user = await User.findOne({ email }).select(
        "+password +loginLockedUntil +monthlyOtpHash +monthlyOtpMonth",
      );
      if (!user || user.role !== "student") {
        await recordAudit(req, {
          action: "student_otp_request",
          outcome: "failure",
          email,
          details: "Student account is not registered",
        });
        return res.status(401).json({
          message:
            "This student account is not registered. Please contact the admin office.",
        });
      }
      const accessCheck = validatePortalAccess({
        user,
        email,
        portal: "student",
      });
      if (!accessCheck.ok) {
        return res.status(accessCheck.status).json({
          message: accessCheck.message,
        });
      }
      if (!(await user.comparePassword(req.body.password))) {
        await recordAudit(req, {
          action: "student_otp_request",
          outcome: "failure",
          user,
          email,
          details: "Invalid student password",
        });
        return res.status(401).json({
          message: "Invalid student email or password.",
        });
      }
      if (!user.isActive || user.isArchived)
        return res.status(403).json({
          message: "This account is disabled. Contact an administrator.",
        });
      if (user.loginLockedUntil && user.loginLockedUntil > Date.now())
        return res.status(429).json({
          message:
            "This account is temporarily locked. Reset your password or try again in 5 minutes.",
        });

      const month = getPhilippineMonthString();
      if (user.monthlyOtpHash && user.monthlyOtpMonth === month) {
        await recordAudit(req, {
          action: "student_otp_request",
          outcome: "success",
          user,
          details: `Existing OTP reused for ${month}; no new code sent`,
        });
        return res.json({
          alreadyActive: true,
          message:
            "You already have an active OTP for this month. Use the code you previously received; a new code cannot be sent until next month.",
        });
      }

      const code = crypto.randomInt(100000, 1000000).toString();
      user.monthlyOtpHash = crypto
        .createHash("sha256")
        .update(code)
        .digest("hex");
      user.monthlyOtpMonth = month;
      const result = await sendMail({
        to: user.email,
        ...studentMonthlyOtpEmail({ fullName: user.fullName, code }),
      });
      if (result.unavailable || result.sent === false) {
        return res.status(503).json({
          message:
            result.message ||
            "Email delivery is temporarily unavailable. Please contact the admin office or try again later.",
          emailUnavailable: true,
        });
      }
      await user.save();
      await recordAudit(req, {
        action: "student_otp_issued",
        outcome: "success",
        user,
        details: `OTP sent for ${month}`,
      });
      res.json({
        message:
          "OTP sent to your school email. Save it securely or take a picture for future logins.",
      });
    } catch (err) {
      res.status(500).json({
        message: "Unable to send OTP.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

// @route   POST /api/auth/forgot-password
// @desc    Available on the Student and Admin (admin/coordinator) portals — Company accounts
//          use the same underlying flow too. Always responds with the same generic message
//          regardless of whether the email exists, so this endpoint can't be used to check
//          which emails are registered. Email delivery must be configured for this flow;
//          reset codes are never returned through the API.
router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("A valid email is required.")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const genericResponse = {
      message:
        "If an account exists for that email, a 6-digit code has been sent to it.",
    };

    try {
      const user = await User.findOne({ email: req.body.email.toLowerCase() });
      if (!user || !user.isActive) {
        return res.json(genericResponse);
      }

      const code = crypto.randomInt(100000, 1000000).toString(); // 6 digits, 100000–999999
      user.resetPasswordCodeHash = crypto
        .createHash("sha256")
        .update(code)
        .digest("hex");
      user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
      user.resetPasswordAttempts = 0;

      const { subject, html } = passwordResetEmail({
        fullName: user.fullName,
        code,
      });
      const result = await sendMail({ to: user.email, subject, html });

      if (result.skipped) {
        return res.status(503).json({
          message:
            "Email delivery is not configured. Please contact an administrator.",
          emailUnavailable: true,
        });
      }
      if (result.unavailable || result.sent === false) {
        return res.status(503).json({
          message:
            result.message ||
            "Email delivery is temporarily unavailable. Please contact the admin office or try again later.",
          emailUnavailable: true,
        });
      }

      await user.save();

      res.json(genericResponse);
    } catch (err) {
      res.status(500).json({
        message: "Failed to process request.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

// @route   POST /api/auth/reset-password
// @desc    Takes the email + the 6-digit code just emailed to it + a new password, all in one
//          step. Locks out after 5 wrong codes (must request a fresh one) since a 6-digit
//          space is small enough to brute-force otherwise.
router.post(
  "/reset-password",
  [
    body("email").isEmail().withMessage("A valid email is required."),
    body("code")
      .isLength({ min: 6, max: 6 })
      .withMessage("Enter the 6-digit code from your email."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const user = await User.findOne({
        email: req.body.email.toLowerCase(),
      }).select(
        "+resetPasswordCodeHash +resetPasswordExpires +resetPasswordAttempts +failedLoginAttempts +loginLockedUntil",
      );

      if (
        !user ||
        !user.resetPasswordCodeHash ||
        !user.resetPasswordExpires ||
        user.resetPasswordExpires < Date.now()
      ) {
        return res.status(400).json({
          message: "This code is invalid or has expired. Request a new one.",
        });
      }

      if (user.resetPasswordAttempts >= 5) {
        return res.status(429).json({
          message: "Too many incorrect attempts. Request a new code.",
        });
      }

      const codeHash = crypto
        .createHash("sha256")
        .update(req.body.code)
        .digest("hex");
      if (codeHash !== user.resetPasswordCodeHash) {
        user.resetPasswordAttempts += 1;
        await user.save();
        return res
          .status(400)
          .json({ message: "Incorrect code. Please try again." });
      }

      user.password = req.body.password;
      user.resetPasswordCodeHash = undefined;
      user.resetPasswordExpires = undefined;
      user.resetPasswordAttempts = 0;
      user.failedLoginAttempts = 0;
      user.loginLockedUntil = undefined;
      await user.save();

      await recordAudit(req, {
        action: "password_reset",
        outcome: "success",
        user,
        details: "Password reset and login lock cleared",
      });

      res.json({
        message:
          "Password reset successfully. You can now log in with your new password.",
      });
    } catch (err) {
      res.status(500).json({
        message: "Failed to reset password.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

// @route   PUT /api/auth/change-password
// @desc    For someone already logged in who knows their current password (e.g. the student
//          profile page) — different from forgot-password, which is for someone locked out
//          with no current password to prove. Uses 400 (not 401) for a wrong current
//          password so the axios interceptor's auto-logout-on-401 doesn't kick the user out
//          over a typo.
router.put(
  "/change-password",
  protect,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required."),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("New password must be at least 8 characters."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const user = await User.findById(req.user._id).select("+password");
      const isMatch = await user.comparePassword(req.body.currentPassword);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect." });
      }

      user.password = req.body.newPassword;
      await user.save();

      res.json({ message: "Password updated successfully." });
    } catch (err) {
      res.status(500).json({
        message: "Failed to update password.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

// @route   GET /api/auth/me
router.get("/me", protect, async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

module.exports = router;

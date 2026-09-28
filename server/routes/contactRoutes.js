const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const PublicConcern = require("../models/PublicConcern");
const { sendMail } = require("../utils/mailer");
const { createInAppNotification } = require("../utils/notify");
const { optionalProtect } = require("../middleware/auth");

const router = express.Router();

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

router.post(
  "/concerns",
  optionalProtect,
  [
    body("name")
      .trim()
      .isLength({ min: 2, max: 160 })
      .withMessage("Name must be between 2 and 160 characters."),
    body("email").isEmail().withMessage("Enter a valid email address."),
    body("message")
      .trim()
      .isLength({ min: 10, max: 3000 })
      .withMessage("Concern must be between 10 and 3000 characters."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    const submittedEmail =
      req.user?.email || req.body.email.trim().toLowerCase();
    const registeredUser =
      req.user ||
      (await User.findOne({
        email: submittedEmail,
        isActive: true,
        isArchived: false,
      }));
    if (!registeredUser) {
      return res.status(403).json({
        message: "Only registered active users can send a public concern.",
      });
    }

    const email = registeredUser.email;
    const name = registeredUser.fullName;
    const concern = await PublicConcern.create({
      name,
      email,
      message: req.body.message.trim(),
    });
    const adminEmail =
      process.env.CONCERN_RECEIVER ||
      process.env.ADMIN_EMAIL ||
      "nav.bar2026@gmail.com";
    const result = await sendMail({
      to: adminEmail,
      allowDevOverride: true,
      subject: `Public concern from ${name}`,
      html: `<h2>Public concern</h2><p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p><p>${escapeHtml(req.body.message.trim()).replace(/\n/g, "<br>")}</p>`,
    });
    const admins = await User.find({
      role: "admin",
      isActive: true,
      isArchived: false,
    }).select("_id");
    await Promise.all(
      admins.map((admin) =>
        createInAppNotification({
          recipientUserId: admin._id,
          type: "public_concern",
          title: `New public concern from ${name}`,
          body: req.body.message.trim().slice(0, 200),
          link: `/messages?view=concerns&concernId=${concern._id}`,
        }),
      ),
    );

    res.json({
      message:
        adminEmail && !result.skipped && result.sent !== false
          ? "Your concern was sent to the admin office."
          : "Your concern was saved and sent to the admin messages inbox.",
      concernId: concern._id,
    });
  },
);

module.exports = router;

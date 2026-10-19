const express = require("express");
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const upload = require("../middleware/upload");
const Message = require("../models/Message");
const User = require("../models/User");
const PublicConcern = require("../models/PublicConcern");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");
const { notify, createInAppNotification } = require("../utils/notify");
const { sendMail } = require("../utils/mailer");
const { persistUpload } = require("../utils/persistUpload");
const {
  archiveMessage,
  getHistoryModel,
} = require("../utils/messageHistory");

const router = express.Router();
const MESSAGE_ROLES = ["student", "company", "coordinator", "registrar", "admin"];
const getMessageRecipients = (role) =>
  MESSAGE_ROLES.includes(role)
    ? MESSAGE_ROLES.filter((recipientRole) => recipientRole !== role)
    : [];
const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

router.get("/public-concerns", protect, async (req, res) => {
  if (req.user.role !== "admin")
    return res
      .status(403)
      .json({ message: "Only admins can view public concerns." });
  const concerns = await PublicConcern.find()
    .populate("repliedBy", "fullName role")
    .populate("submitter", "fullName email role")
    .populate("replies.author", "fullName role")
    .sort({ createdAt: -1 })
    .limit(100);
  await PublicConcern.updateMany(
    { readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } },
  );
  await Notification.updateMany(
    { recipient: req.user._id, type: "public_concern", read: false },
    { read: true },
  );
  res.json({ concerns });
});

router.get("/public-concerns/mine", protect, async (req, res) => {
  if (req.user.role === "admin")
    return res.status(403).json({
      message: "Admin accounts review concerns in the administrator inbox.",
    });
  const concerns = await PublicConcern.find({ submitter: req.user._id })
    .populate("replies.author", "fullName role")
    .sort({ createdAt: -1 })
    .limit(100);
  await Notification.updateMany(
    { recipient: req.user._id, type: "public_concern", read: false },
    { read: true },
  );
  res.json({ concerns });
});

router.post("/public-concerns", protect, async (req, res) => {
  if (req.user.role === "admin")
    return res.status(403).json({
      message: "Administrator accounts cannot submit public concerns.",
    });
  const subject = String(req.body.subject || "").trim();
  const category = String(req.body.category || "").trim();
  const message = String(req.body.message || "").trim();
  const allowedCategories = [
    "account_access",
    "technical_issue",
    "placement",
    "records",
    "other",
  ];
  if (subject.length < 3 || subject.length > 160)
    return res
      .status(400)
      .json({ message: "Subject must be between 3 and 160 characters." });
  if (!allowedCategories.includes(category))
    return res.status(400).json({ message: "Select a valid concern category." });
  if (message.length < 10 || message.length > 3000)
    return res
      .status(400)
      .json({ message: "Concern must be between 10 and 3000 characters." });

  const concern = await PublicConcern.create({
    name: req.user.fullName,
    email: req.user.email,
    subject,
    category,
    message,
    submitter: req.user._id,
    submitterRole: req.user.role,
    status: "open",
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
        title: `New concern from ${req.user.fullName}`,
        body: subject,
        link: `/messages?view=concerns&concernId=${concern._id}`,
      }),
    ),
  );

  await concern.populate("replies.author", "fullName role");
  res.status(201).json({ concern });
});

router.post("/public-concerns/:id/replies", protect, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(404).json({ message: "Public concern not found." });
  const body = String(req.body.body || "").trim();
  if (!body || body.length > 3000)
    return res.status(400).json({
      message: "Reply must be between 1 and 3000 characters.",
    });
  const concern = await PublicConcern.findById(req.params.id);
  if (!concern)
    return res.status(404).json({ message: "Public concern not found." });
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && String(concern.submitter) !== String(req.user._id))
    return res.status(404).json({ message: "Public concern not found." });

  concern.replies.push({
    author: req.user._id,
    authorName: req.user.fullName,
    authorRole: req.user.role,
    body,
  });
  if (isAdmin) {
    concern.reply = body;
    concern.repliedAt = new Date();
    concern.repliedBy = req.user._id;
    concern.status = "responded";
    concern.resolvedAt = null;
  } else {
    concern.status = "open";
    concern.resolvedAt = null;
  }
  await concern.save();

  if (isAdmin && concern.submitter) {
    const submitter = await User.findById(concern.submitter).select(
      "fullName email",
    );
    if (submitter) {
      await notify({
        recipientUserId: submitter._id,
        recipientEmail: submitter.email,
        recipientName: submitter.fullName,
        type: "public_concern",
        title: `Admin replied: ${concern.subject}`,
        body: body.slice(0, 200),
        link: `/messages?view=my-concerns&concernId=${concern._id}`,
      });
    }
  } else if (isAdmin) {
    await sendMail({
      to: concern.email,
      subject: "Reply from ASIATECH SYNC regarding your concern",
      html: `<p>Hello ${escapeHtml(concern.name)},</p><p>${escapeHtml(body).replace(/\n/g, "<br>")}</p><p>Regards,<br>ASIATECH SYNC Admin Office</p>`,
    });
  } else if (!isAdmin) {
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
          title: `Follow-up from ${req.user.fullName}`,
          body: concern.subject,
          link: `/messages?view=concerns&concernId=${concern._id}`,
        }),
      ),
    );
  }

  await concern.populate("replies.author", "fullName role");
  res.json({ concern });
});

router.put("/public-concerns/:id/status", protect, async (req, res) => {
  if (req.user.role !== "admin")
    return res
      .status(403)
      .json({ message: "Only admins can update concern status." });
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(404).json({ message: "Public concern not found." });
  const { status } = req.body;
  if (!["open", "resolved"].includes(status))
    return res
      .status(400)
      .json({ message: "Status must be open or resolved." });
  const concern = await PublicConcern.findById(req.params.id);
  if (!concern)
    return res.status(404).json({ message: "Public concern not found." });
  concern.status = status;
  concern.resolvedAt = status === "resolved" ? new Date() : null;
  await concern.save();
  if (concern.submitter) {
    const submitter = await User.findById(concern.submitter).select(
      "fullName email",
    );
    if (submitter)
      await notify({
        recipientUserId: submitter._id,
        recipientEmail: submitter.email,
        recipientName: submitter.fullName,
        type: "public_concern",
        title:
          status === "resolved"
            ? `Concern resolved: ${concern.subject}`
            : `Concern reopened: ${concern.subject}`,
        body:
          status === "resolved"
            ? "The admin office marked your concern as resolved."
            : "The admin office reopened your concern.",
        link: `/messages?view=my-concerns&concernId=${concern._id}`,
      });
  }
  await concern.populate("replies.author", "fullName role");
  res.json({ concern });
});

router.get("/unread-count", protect, async (req, res) => {
  const conversations = await Conversation.find({
    participants: req.user._id,
  }).select("_id");
  const conversationIds = conversations.map(({ _id }) => _id);
  const [unreadMessages, unreadConcerns] = await Promise.all([
    Message.countDocuments({
      conversation: { $in: conversationIds },
      sender: { $ne: req.user._id },
      readAt: null,
    }),
    Notification.countDocuments({
      recipient: req.user._id,
      type: "public_concern",
      read: false,
    }),
  ]);
  res.json({ count: unreadMessages + unreadConcerns });
});

router.post("/public-concerns/:id/reply", protect, async (req, res) => {
  if (req.user.role !== "admin")
    return res
      .status(403)
      .json({ message: "Only admins can reply to public concerns." });
  const body = String(req.body.body || "").trim();
  if (!body) return res.status(400).json({ message: "Reply cannot be empty." });
  const concern = await PublicConcern.findById(req.params.id);
  if (!concern)
    return res.status(404).json({ message: "Public concern not found." });
  concern.reply = body;
  concern.repliedAt = new Date();
  concern.repliedBy = req.user._id;
  concern.status = "responded";
  concern.replies.push({
    author: req.user._id,
    authorName: req.user.fullName,
    authorRole: req.user.role,
    body,
  });
  await concern.save();
  const result = await sendMail({
    to: concern.email,
    subject: `Reply from ASIATECH SYNC regarding your concern`,
    html: `<p>Hello ${escapeHtml(concern.name)},</p><p>${escapeHtml(body).replace(/\n/g, "<br>")}</p><p>Regards,<br>ASIATECH SYNC Admin Office</p>`,
  });
  res.json({ concern, emailSent: result.sent !== false && !result.skipped });
});

// @route   GET /api/messages/conversations
// @desc    Every conversation the logged-in user (student or company) is part of, most
//          recently active first, with an unread count for each.
router.get("/conversations", protect, async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user._id })
    .populate("participants", "fullName email role")
    .populate("job", "title")
    .sort({ lastMessageAt: -1 });

  const conversationIds = conversations.map((conversation) => conversation._id);
  const unreadCounts = conversationIds.length
    ? await Message.aggregate([
        {
          $match: {
            conversation: { $in: conversationIds },
            sender: { $ne: req.user._id },
            readAt: null,
          },
        },
        { $group: { _id: "$conversation", count: { $sum: 1 } } },
      ])
    : [];
  const unreadByConversation = new Map(
    unreadCounts.map((entry) => [String(entry._id), entry.count]),
  );
  const withUnread = conversations.map((conversation) => ({
    ...conversation.toObject(),
    unreadCount: unreadByConversation.get(String(conversation._id)) || 0,
  }));

  res.json({ conversations: withUnread });
});

// @route   GET /api/messages/admins
// @desc    Returns active platform administrators so a student can start a direct support chat.
router.get("/admins", protect, async (req, res) => {
  const admins = await User.find({
    role: "admin",
    isActive: true,
    isArchived: false,
  })
    .select("_id fullName email role")
    .sort({ fullName: 1 });

  res.json({ admins });
});

// @route   GET /api/messages/contacts
// @desc    Return recipients the current role is allowed to contact directly.
router.get("/contacts", protect, async (req, res) => {
  const roles = getMessageRecipients(req.user.role);
  const contacts = await User.find({
    _id: { $ne: req.user._id },
    role: { $in: roles },
    isActive: true,
    isArchived: false,
  })
    .select("_id fullName email role")
    .sort({ fullName: 1 });
  res.json({ contacts });
});

// @route   POST /api/messages/conversations
// @desc    Find the existing thread with this person (about this job, if given) or start a
//          new one.
router.post("/conversations", protect, async (req, res) => {
  try {
    const { otherUserId, jobId } = req.body;
    if (!otherUserId || !mongoose.isValidObjectId(otherUserId)) {
      return res
        .status(400)
        .json({ message: "A valid recipient is required." });
    }

    const otherUser = await User.findById(otherUserId);
    if (!otherUser || !otherUser.isActive || otherUser.isArchived) {
      return res.status(404).json({ message: "That user could not be found." });
    }

    if (
      otherUser._id.equals(req.user._id) ||
      !getMessageRecipients(req.user.role).includes(otherUser.role)
    ) {
      return res.status(400).json({
        message: "Messaging is not available between these account roles.",
      });
    }

    if (jobId && !mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ message: "A valid job is required." });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, otherUserId], $size: 2 },
      job: jobId || null,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, otherUserId],
        job: jobId || undefined,
      });
    }

    await conversation.populate("participants", "fullName email role");
    await conversation.populate("job", "title");

    res.status(201).json({ conversation });
  } catch (err) {
    console.error("[ASIATECH SYNC] Failed to start conversation:", err.message);
    res.status(500).json({
      message: "Failed to start conversation.",
      ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
    });
  }
});

// @route   GET /api/messages/conversations/:id/messages
// @desc    Full message history for one thread. Viewing it marks the other person's
//          messages as read, which is what clears this thread's unread badge.
router.get("/conversations/:id/messages", protect, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(404).json({ message: "Conversation not found." });
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    participants: req.user._id,
  });
  if (!conversation)
    return res.status(404).json({ message: "Conversation not found." });

  const unreadFilter = {
    conversation: conversation._id,
    sender: { $ne: req.user._id },
    readAt: null,
  };
  const readAt = new Date();
  const unreadMessages = await Message.find(unreadFilter).select("_id").lean();
  if (unreadMessages.length) {
    const messageIds = unreadMessages.map(({ _id }) => _id);
    await Message.updateMany(
      { _id: { $in: messageIds }, readAt: null },
      { readAt },
    );

    const historyModel = getHistoryModel(req.user.role);
    if (historyModel) {
      await historyModel.updateMany(
        { sourceMessage: { $in: messageIds }, ownerUser: req.user._id },
        { readAt },
      );
    }
  }

  await Notification.updateMany(
    {
      recipient: req.user._id,
      type: "new_message",
      link: `/messages/${conversation._id}`,
      read: false,
    },
    { read: true },
  );

  const messages = await Message.find({ conversation: conversation._id })
    .populate("sender", "fullName role")
    .sort({ createdAt: 1 });

  res.json({ conversation, messages });
});

// @route   DELETE /api/messages/conversations/:id
// @desc    Allows admins to permanently remove a conversation and its messages.
router.delete("/conversations/:id", protect, async (req, res) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Only admins can delete conversations." });
  }
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(404).json({ message: "Conversation not found." });

  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found." });
  }

  await Message.deleteMany({ conversation: conversation._id });
  await Conversation.findByIdAndDelete(conversation._id);

  res.json({ success: true, deletedConversationId: conversation._id });
});

// @route   POST /api/messages/conversations/:id/messages
// @desc    Send a message. Notifies the other participant both in-app (bell) and by email.
// Multer error handling for oversized/invalid attachments (max 50MB).
const attachmentUploadError = (err, req, res, next) => {
  if (!err) return next();
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(400)
      .json({ message: "File is too large. Maximum size is 50MB." });
  }
  return res
    .status(400)
    .json({ message: err.message || "The attachment could not be uploaded." });
};

router.post(
  "/conversations/:id/messages",
  protect,
  upload.uploadMessageAttachment.single("file"),
  attachmentUploadError,
  async (req, res) => {
  try {
    const text = typeof req.body.body === "string" ? req.body.body.trim() : "";
    if (!req.file && !text) {
      return res.status(400).json({ message: "Message cannot be empty." });
    }
    const body = text || req.file.originalname;
    if (body.trim().length > 3000)
      return res
        .status(400)
        .json({ message: "Message cannot exceed 3000 characters." });
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "Conversation not found." });

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });
    if (!conversation)
      return res.status(404).json({ message: "Conversation not found." });

    // Honors STORAGE_PROVIDER: local disk by default, Cloudinary when configured
    // (so attachments survive redeploys and stay viewable by every participant).
    let attachmentUrl = "";
    if (req.file) {
      attachmentUrl = await persistUpload(req.file, {
        folder: "message-attachments",
      });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      body: body.trim(),
      attachment: req.file
        ? {
            url: attachmentUrl,
            name: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
          }
        : undefined,
    });

    try {
      await archiveMessage(message, conversation);
    } catch (historyError) {
      console.error(
        "[ASIATECH SYNC] Failed to archive message history:",
        historyError.message,
      );
    }

    conversation.lastMessageAt = new Date();
    conversation.lastMessagePreview = body.trim().slice(0, 140);
    await conversation.save();

    const recipientIds = conversation.participants.filter(
      (participantId) => participantId.toString() !== req.user._id.toString(),
    );
    const recipients = await User.find({ _id: { $in: recipientIds } }).select(
      "fullName email",
    );
    await Promise.all(
      recipients.map((recipient) =>
        notify({
          recipientUserId: recipient._id,
          recipientEmail: recipient.email,
          recipientName: recipient.fullName,
          type: "new_message",
          title: `New message from ${req.user.fullName}`,
          body: message.body.slice(0, 200),
          link: `/messages/${conversation._id}`,
        }),
      ),
    );

    await message.populate("sender", "fullName role");
    res.status(201).json({ message });
  } catch (err) {
    console.error("[ASIATECH SYNC] Failed to send message:", err.message);
    res.status(500).json({
      message: "Message could not be delivered. Please retry.",
      ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
    });
  }
  },
);

module.exports = router;

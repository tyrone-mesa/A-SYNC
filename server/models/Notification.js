const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "application_status",
        "document_verification",
        "document_uploaded",
        "new_application",
        "new_message",
        "job_posted",
        "public_concern",
        "company_verified",
        "attendance_update",
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "", trim: true },
    // Where clicking the notification should take the user — a relative client path,
    // e.g. "/student/applications" or "/messages/<conversationId>".
    link: { type: String, default: "" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);

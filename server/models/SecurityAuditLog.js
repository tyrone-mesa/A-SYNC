const mongoose = require("mongoose");

const SecurityAuditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    outcome: {
      type: String,
      enum: ["success", "failure", "blocked"],
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    email: { type: String, trim: true, lowercase: true },
    role: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    details: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

SecurityAuditLogSchema.index({ createdAt: -1 });
// Auto-delete audit entries older than 90 days to prevent unbounded collection growth.
SecurityAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
SecurityAuditLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("SecurityAuditLog", SecurityAuditLogSchema);

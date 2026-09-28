const mongoose = require("mongoose");

const PublicConcernSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    email: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, trim: true, maxlength: 160, default: "Public concern" },
    category: { type: String, trim: true, maxlength: 60, default: "other" },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    submitter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    submitterRole: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["open", "responded", "resolved"],
      default: "open",
    },
    reply: { type: String, default: "", trim: true, maxlength: 3000 },
    repliedAt: { type: Date, default: null },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    replies: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        authorName: { type: String, required: true, trim: true, maxlength: 160 },
        authorRole: { type: String, required: true, trim: true },
        body: { type: String, required: true, trim: true, maxlength: 3000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    resolvedAt: { type: Date, default: null },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

PublicConcernSchema.index({ createdAt: -1 });
PublicConcernSchema.index({ submitter: 1, createdAt: -1 });

module.exports = mongoose.model("PublicConcern", PublicConcernSchema);

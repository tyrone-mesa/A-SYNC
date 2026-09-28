const mongoose = require("mongoose");

const MessageHistorySchema = new mongoose.Schema(
  {
    sourceMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    ownerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ownerRole: {
      type: String,
      enum: ["student", "company", "coordinator", "registrar", "admin"],
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: { type: String, required: true, maxlength: 3000 },
    sentAt: { type: Date, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

MessageHistorySchema.index(
  { sourceMessage: 1, ownerUser: 1 },
  { unique: true },
);
MessageHistorySchema.index({ ownerUser: 1, sentAt: 1 });

module.exports = MessageHistorySchema;

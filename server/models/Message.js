const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 3000 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

MessageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model('Message', MessageSchema);

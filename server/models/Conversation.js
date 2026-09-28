const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema(
  {
    // Always exactly one student-role user and one company-role user. Kept as a plain array
    // (rather than separate `student`/`company` fields) so a single $in query finds every
    // conversation for a given logged-in user regardless of their role.
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    // Optional context: which job posting this conversation is about, if any. Lets a
    // "Message" button from a job or applicant screen land in the right existing thread
    // instead of always starting a fresh, contextless one.
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessagePreview: { type: String, default: '', trim: true, maxlength: 140 },
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1, lastMessageAt: -1 });
// Note: uniqueness of "one thread per participant pair + job" is enforced in the route
// handler (find-existing-or-create), not via a schema index — a compound unique index with
// an array field is multikey and would incorrectly reject, e.g., a second unrelated student
// messaging the same company about the same job.

module.exports = mongoose.model('Conversation', ConversationSchema);

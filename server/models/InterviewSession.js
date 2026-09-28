const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, default: '' },
    score: { type: Number, min: 0, max: 10, default: null },
    feedback: { type: String, default: '' },
  },
  { _id: false }
);

const InterviewSessionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    jobTitle: { type: String, required: true, trim: true },
    department: { type: String, trim: true, default: '' },
    questions: [QuestionSchema],
    totalScore: { type: Number, default: null }, // sum of per-question scores
    maxScore: { type: Number, default: null }, // questions.length * 10
    overallFeedback: { type: String, default: '' },
    status: { type: String, enum: ['generated', 'scored'], default: 'generated' },
  },
  { timestamps: true }
);

InterviewSessionSchema.index({ student: 1, createdAt: -1 });

module.exports = mongoose.model('InterviewSession', InterviewSessionSchema);

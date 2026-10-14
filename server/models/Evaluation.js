const mongoose = require("mongoose");

// Batch 5: company evaluation of an OJT trainee. One FINAL evaluation per
// student+company is enforced via a partial unique index; drafts may iterate.
const evaluationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyProfile",
      required: true,
    },
    ratings: {
      workQuality: { type: Number, min: 1, max: 5, required: true },
      productivity: { type: Number, min: 1, max: 5, required: true },
      communication: { type: Number, min: 1, max: 5, required: true },
      punctuality: { type: Number, min: 1, max: 5, required: true },
      teamwork: { type: Number, min: 1, max: 5, required: true },
      initiative: { type: Number, min: 1, max: 5, required: true },
    },
    strengths: { type: String, default: "", trim: true },
    improvements: { type: String, default: "", trim: true },
    overallComments: { type: String, default: "", trim: true },
    recommendation: {
      type: String,
      enum: [
        "highly_recommend",
        "recommend",
        "recommend_with_reservations",
        "do_not_recommend",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "final"],
      default: "draft",
    },
    submittedAt: { type: Date },
  },
  { timestamps: true },
);

evaluationSchema.index(
  { student: 1, company: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "final" },
  },
);

module.exports = mongoose.model("Evaluation", evaluationSchema);

const mongoose = require("mongoose");

const ApplicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
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
    coverNote: { type: String, trim: true, default: "", maxlength: 1500 },
    status: {
      type: String,
      enum: ["in_review", "approved", "declined"],
      default: "in_review",
    },
    statusHistory: [
      {
        status: { type: String },
        changedAt: { type: Date, default: Date.now },
        note: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true },
);

// A student may only apply once per job posting.
ApplicationSchema.index({ job: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("Application", ApplicationSchema);

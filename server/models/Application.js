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
      enum: [
        "in_review",
        "interview_scheduled",
        "approved",
        "declined",
        "withdrawn",
        // An admin/coordinator asked the company to take this student over from another
        // company. The student's current placement stays "approved" until this company
        // confirms (-> "approved") or refuses (-> "declined").
        "transfer_pending",
        // The student's OJT placement that was moved to another company.
        "transferred",
      ],
      default: "in_review",
    },
    // Set only on applications created by an admin/coordinator transfer request.
    transfer: {
      fromApplication: { type: mongoose.Schema.Types.ObjectId, ref: "Application" },
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      requestedByRole: { type: String, default: "" },
      reason: { type: String, trim: true, default: "", maxlength: 1000 },
      requestedAt: { type: Date },
    },
    // Set on the OLD placement once the transfer is confirmed.
    transferredToApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
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

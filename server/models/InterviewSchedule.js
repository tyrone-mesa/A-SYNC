const mongoose = require("mongoose");

// Batch 2: interview scheduling between companies and student applicants.
// Distinct from InterviewSession (the AI practice simulator).
const interviewScheduleSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyProfile",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
    },
    proposedDateTime: { type: Date, required: true },
    mode: {
      type: String,
      enum: ["online", "onsite"],
      default: "online",
    },
    locationOrLink: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: [
        "proposed",
        "confirmed",
        "reschedule_requested",
        "completed",
        "cancelled",
      ],
      default: "proposed",
    },
    rescheduleDateTime: { type: Date },
    rescheduleNote: { type: String, default: "" },
    confirmedAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("InterviewSchedule", interviewScheduleSchema);

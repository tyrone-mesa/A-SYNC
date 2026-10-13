const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyProfile",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true }, // e.g. IT, Marketing, Engineering
    // Mandatory classification set by the company when posting: an OJT/internship slot, or a
    // regular paid Full-Time Job opening. Full-Time postings are gated behind a minimum
    // completed-OJT-hours requirement (see MIN_HOURS_FOR_FULLTIME_JOBS in config/constants.js).
    jobType: {
      type: String,
      enum: ["OJT", "Full-Time Job"],
      required: true,
      default: "OJT",
    },
    description: { type: String, required: true, maxlength: 4000 },
    responsibilities: [{ type: String, trim: true }],
    skillsRequired: [{ type: String, trim: true }],
    slotsAvailable: { type: Number, required: true, min: 1, default: 1 },
    slotsFilled: { type: Number, default: 0 },
    location: { type: String, trim: true, default: "On-site" },
    workSetup: {
      type: String,
      enum: ["On-site", "Remote", "Hybrid"],
      default: "On-site",
    },
    minHoursPerWeek: { type: Number, default: 20 },
    // For OJT postings this is a stipend (e.g. "Unpaid", "₱3,000/mo allowance"); for Full-Time
    // Job postings it doubles as the salary range (e.g. "₱28,000 – ₱35,000 / mo").
    stipend: { type: String, trim: true, default: "Unpaid" },
    applicationDeadline: { type: Date },
    status: {
      type: String,
      enum: ["open", "closed", "archived"],
      default: "open",
    },
  },
  { timestamps: true },
);

JobSchema.index({ title: "text", description: "text" });
JobSchema.index({ department: 1 });
JobSchema.index({ skillsRequired: 1 });
JobSchema.index({ status: 1 });
JobSchema.index({ jobType: 1 });
JobSchema.index({ status: 1, createdAt: -1 });
JobSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model("Job", JobSchema);

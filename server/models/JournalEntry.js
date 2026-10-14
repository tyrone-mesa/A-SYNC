const mongoose = require("mongoose");

// Batch 4: OJT journal - daily/weekly reflective entries written by students
// during their immersion and read by coordinators, admins, and (later, with the
// evaluation batch) their host companies.
const journalEntrySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
    },
    entryDate: { type: Date, required: true },
    activities: { type: String, required: true, trim: true },
    learnings: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["draft", "submitted"],
      default: "draft",
    },
  },
  { timestamps: true },
);

journalEntrySchema.index({ student: 1, entryDate: -1 });

module.exports = mongoose.model("JournalEntry", journalEntrySchema);

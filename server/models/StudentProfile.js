const mongoose = require("mongoose");

const StudentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    studentId: { type: String, trim: true, unique: true, sparse: true },
    course: { type: String, trim: true, default: "" },
    yearLevel: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" }, // e.g. IT, Engineering, Business
    requiredOJTHours: { type: Number, default: 0 },
    completedOJTHours: { type: Number, default: 0 },
    skills: [{ type: String, trim: true }],
    bio: { type: String, trim: true, default: "", maxlength: 1000 },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    resumeUrl: { type: String, default: "" }, // path to uploaded resume file
    resumeOriginalName: { type: String, default: "" },
    transcriptUrl: { type: String, default: "" }, // path to uploaded transcript/COR file
    transcriptOriginalName: { type: String, default: "" },
    resumeStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    resumeRejectionReason: { type: String, default: "" },
    transcriptStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    transcriptRejectionReason: { type: String, default: "" },
    // Batch 6: OJT completion verification by the admin office.
    ojtCompletionVerified: { type: Boolean, default: false },
    ojtCompletionVerifiedAt: { type: Date },
    // Batch 9: coordinating staff member assigned to this student.
    coordinator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    avatarUrl: { type: String, default: "" },
    avatarOriginalName: { type: String, default: "" },
    avatarMimeType: { type: String, default: "" },
    isProfileComplete: { type: Boolean, default: false },
    companyPlacement: { type: String, trim: true, default: "" },
    performanceGrade: { type: String, trim: true, default: "" },
    evaluation: { type: String, trim: true, default: "", maxlength: 3000 },
    certificateUrl: { type: String, default: "" },
    certificateOriginalName: { type: String, default: "" },
    assessmentSubmittedAt: { type: Date },
    assessmentCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyProfile",
    },
  },
  { timestamps: true },
);

StudentProfileSchema.index({ skills: 1 });
StudentProfileSchema.index({ department: 1 });

module.exports = mongoose.model("StudentProfile", StudentProfileSchema);

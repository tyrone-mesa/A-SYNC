const mongoose = require("mongoose");

const AttendanceLogSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyProfile",
      default: null,
    },
    // Calendar date (Philippine time, YYYY-MM-DD) that this session's Time In falls on.
    date: { type: String, required: true },
    timeIn: { type: Date, required: true },
    timeOut: { type: Date },
    hoursLogged: { type: Number, default: 0 },
    status: { type: String, enum: ["open", "completed"], default: "open" },
    // Flag to indicate if company has verified/recorded this attendance
    companyVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

AttendanceLogSchema.index({ student: 1, status: 1 });
AttendanceLogSchema.index({ student: 1, date: -1 });
AttendanceLogSchema.index({ company: 1, status: 1 });
AttendanceLogSchema.index({ company: 1, date: -1 });

module.exports = mongoose.model("AttendanceLog", AttendanceLogSchema);

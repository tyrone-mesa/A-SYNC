const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { STUDENT_EMAIL_DOMAIN } = require("../config/constants");

const UserSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ["student", "company", "admin", "coordinator", "registrar"],
      required: true,
      default: "student",
    },
    // Admin accounts: "full" (everything) or "read-only" (view + messages only).
    adminType: {
      type: String,
      enum: ["full", "read-only"],
      default: "full",
    },
    // Coordinator accounts: the course / program(s) they oversee. A coordinator sees every
    // student enrolled in one of these programs (see routes/staffRoutes.js). Ignored for
    // every other role.
    programs: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date },
    lastLoginAt: { type: Date },
    // Password reset flow: a random 6-digit code is generated, hashed, and stored here with
    // an expiry. Only the raw code is ever emailed to the user — the stored hash can't be
    // reverse-engineered even if the database were exposed. resetPasswordAttempts locks the
    // code out after too many wrong guesses, since a 6-digit space is small enough to brute
    // force if left unlimited.
    resetPasswordCodeHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    resetPasswordAttempts: { type: Number, default: 0, select: false },
    monthlyOtpHash: { type: String, select: false },
    monthlyOtpMonth: { type: String, select: false },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    loginLockedUntil: { type: Date, select: false },
  },
  { timestamps: true },
);

// Defense in depth: no matter which route creates the document, a student account can
// never be saved with an email outside the school's domain.
UserSchema.pre("save", function enforceStudentDomain(next) {
  if (
    this.role === "student" &&
    !this.email.toLowerCase().endsWith(`@${STUDENT_EMAIL_DOMAIN}`)
  ) {
    return next(
      new Error(
        `Student accounts must use a @${STUDENT_EMAIL_DOMAIN} email address.`,
      ),
    );
  }
  next();
});

UserSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.index({ role: 1, isActive: 1, isArchived: 1 });

UserSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    role: this.role,
    adminType: this.adminType,
    ...(this.role === "coordinator" ? { programs: this.programs || [] } : {}),
    isActive: this.isActive,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", UserSchema);

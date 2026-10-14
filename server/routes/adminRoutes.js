const express = require("express");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { recordAudit } = require("../utils/securityAudit");
const { createInAppNotification } = require("../utils/notify");
const StudentProfile = require("../models/StudentProfile");
const CompanyProfile = require("../models/CompanyProfile");
const Job = require("../models/Job");
const Application = require("../models/Application");
const AttendanceLog = require("../models/AttendanceLog");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { protect, authorize, authorizeFullAdmin } = require("../middleware/auth");
const upload = require("../middleware/upload");
const scanUploadedFile = require("../middleware/scanUpload");
const generateTempPassword = require("../utils/generateTempPassword");
const { STUDENT_EMAIL_DOMAIN } = require("../config/constants");
const { ALL_PROGRAMS } = require("../config/courses");
const { sendMail } = require("../utils/mailer");
const { getPhilippineMonthString } = require("../utils/philippineTime");
const {
  adminCompanyApprovedEmail,
  adminCompanyRejectedEmail,
  adminNewAccountEmail,
  studentMonthlyOtpEmail,
} = require("../utils/emailTemplates");
const { persistUpload, renameUpload } = require("../utils/persistUpload");
const { removeFile, serveFile } = require("../utils/storage");
const { emitDashboardUpdate } = require("../utils/socket");

const router = express.Router();

const removeUploadedFile = (fileUrl) => removeFile(fileUrl);
const scanUploadedFileIfProvided = (req, res, next) =>
  req.file ? scanUploadedFile(req, res, next) : next();

// Every route below requires a logged-in user. Beyond that, permissions are granted per
// route: admins have full access, while coordinators are only ever given read access to the
// student roster and individual student records — never companies, users, or coordinators.
router.use(protect);

// @route   GET /api/admin/stats
router.get("/stats", authorize("admin"), async (req, res) => {
  const [
    students,
    companies,
    coordinators,
    openJobs,
    applications,
    pendingCompanies,
  ] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "company" }),
    User.countDocuments({ role: "coordinator" }),
    Job.countDocuments({ status: "open" }),
    Application.countDocuments(),
    CompanyProfile.countDocuments({ isVerified: false }),
  ]);
  res.json({
    students,
    companies,
    coordinators,
    openJobs,
    applications,
    pendingCompanies,
  });
});

// @route   GET /api/admin/reports
// @desc    Aggregated breakdowns for the Reports page — by program, application funnel,
//          job type split, company verification split, and a 6-month application trend.
//          Distinct from /stats above, which only gives flat platform-wide counts.
router.get("/reports", authorize("admin"), async (req, res) => {
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

  const [
    studentsByProgram,
    jobsByDepartment,
    applicationsByStatus,
    jobsByType,
    companyVerificationRaw,
    monthlyApplicationsRaw,
    avgHoursRaw,
  ] = await Promise.all([
    StudentProfile.aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Job.aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Application.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Job.aggregate([{ $group: { _id: "$jobType", count: { $sum: 1 } } }]),
    CompanyProfile.aggregate([
      { $group: { _id: "$isVerified", count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    StudentProfile.aggregate([
      { $group: { _id: null, avg: { $avg: "$completedOJTHours" } } },
    ]),
  ]);

  res.json({
    generatedAt: new Date().toISOString(),
    studentsByProgram: studentsByProgram.map((r) => ({
      label: r._id || "Unspecified",
      count: r.count,
    })),
    jobsByDepartment: jobsByDepartment.map((r) => ({
      label: r._id || "Unspecified",
      count: r.count,
    })),
    applicationsByStatus: applicationsByStatus.map((r) => ({
      label: r._id,
      count: r.count,
    })),
    jobsByType: jobsByType.map((r) => ({ label: r._id, count: r.count })),
    companyVerification: companyVerificationRaw.map((r) => ({
      label: r._id ? "Verified" : "Pending",
      count: r.count,
    })),
    monthlyApplications: monthlyApplicationsRaw.map((r) => ({
      label: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
      count: r.count,
    })),
    avgCompletedHours: Math.round((avgHoursRaw[0]?.avg || 0) * 10) / 10,
  });
});

// Batch 10 additions - kept separate so the core report shape stays stable.
router.get("/reports/ojt", authorize("admin"), async (req, res) => {
  try {
    const [verified, notVerified, resumePending, resumeRejected, transcriptPending, transcriptRejected] =
      await Promise.all([
        StudentProfile.countDocuments({ ojtCompletionVerified: true }),
        StudentProfile.countDocuments({ ojtCompletionVerified: false }),
        StudentProfile.countDocuments({ resumeStatus: "pending" }),
        StudentProfile.countDocuments({ resumeStatus: "rejected" }),
        StudentProfile.countDocuments({ transcriptStatus: "pending" }),
        StudentProfile.countDocuments({ transcriptStatus: "rejected" }),
      ]);
    return res.json({
      ojtCompletion: [
        { label: "Verified complete", count: verified },
        { label: "Not yet verified", count: notVerified },
      ],
      documentReview: [
        { label: "Resume pending", count: resumePending },
        { label: "Transcript pending", count: transcriptPending },
        { label: "Resume rejected", count: resumeRejected },
        { label: "Transcript rejected", count: transcriptRejected },
      ],
    });
  } catch (err) {
    return res.status(400).json({ message: "Failed to load OJT report." });
  }
});

// @route   PUT /api/admin/students/:id/assign-coordinator
// @desc    Assign (or unassign) a coordinator to a student.
router.put(
  "/students/:id/assign-coordinator",
  authorize("admin"),
  authorizeFullAdmin,
  async (req, res) => {
    try {
      const profile = await StudentProfile.findById(req.params.id);
      if (!profile)
        return res.status(404).json({ message: "Student not found." });
      const { coordinatorId } = req.body;
      if (coordinatorId) {
        const coordinator = await User.findOne({
          _id: coordinatorId,
          role: "coordinator",
          isActive: true,
        });
        if (!coordinator)
          return res
            .status(400)
            .json({ message: "Coordinator not found or inactive." });
        profile.coordinator = coordinator._id;
      } else {
        profile.coordinator = null;
      }
      await profile.save();
      return res.json({ profile });
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Failed to assign the coordinator." });
    }
  },
);

// @route   GET /api/admin/users
router.get("/users", authorize("admin"), async (req, res) => {
  const { role, archived } = req.query;
  const filter = {
    ...(role ? { role } : {}),
    ...(archived === "true" ? { isArchived: true } : {}),
    ...(archived === "false" ? { isArchived: false } : {}),
  };
  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ users });
});

router.get("/users/:id", authorize("admin"), async (req, res) => {
  const user = await User.findById(req.params.id)
    .select(
      "-password -resetPasswordCodeHash -resetPasswordExpires -resetPasswordAttempts -monthlyOtpHash",
    )
    .lean();
  if (!user) return res.status(404).json({ message: "User not found." });
  const [studentProfile, companyProfile] = await Promise.all([
    StudentProfile.findOne({ user: user._id }).lean(),
    CompanyProfile.findOne({ user: user._id }).lean(),
  ]);
  res.json({ user, studentProfile, companyProfile });
});

router.put(
  "/users/:id",
  authorize("admin"), authorizeFullAdmin,
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required."),
    body("studentId")
      .optional({ checkFalsy: true })
      .matches(/^1-\d{6}$/)
      .withMessage("Student ID must use the format 1-######."),
    body("email").isEmail().withMessage("A valid email is required."),
    body("password")
      .optional({ checkFalsy: true })
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),
    body("password")
      .optional({ checkFalsy: true })
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });
    const user = await User.findById(req.params.id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found." });
    const email = req.body.email.toLowerCase();
    const duplicate = await User.findOne({ email, _id: { $ne: user._id } });
    if (duplicate)
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    user.fullName = req.body.fullName.trim();
    user.email = email;
    if (req.body.password) user.password = req.body.password;
    await user.save();
    res.json({ user: user.toSafeObject() });
  },
);

// @route   PUT /api/admin/users/:id/toggle-active
router.put("/users/:id/toggle-active", authorize("admin"), authorizeFullAdmin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  user.isActive = !user.isActive;
  await user.save();
  emitDashboardUpdate({ roles: ["admin"], scope: "users" });
  res.json({ user: user.toSafeObject() });
});

// @route   DELETE /api/admin/users/:id/archive
// @desc    Soft-archive any account while retaining all related database records.
router.delete("/users/:id/archive", authorize("admin"), authorizeFullAdmin, async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    return res
      .status(400)
      .json({ message: "You cannot archive your own account." });
  }

  const user = await User.findOneAndUpdate(
    { _id: req.params.id, isArchived: false },
    { isActive: false, isArchived: true, archivedAt: new Date() },
    { new: true },
  );
  if (!user) return res.status(404).json({ message: "Active user not found." });

  if (user.role === "company") {
    const company = await CompanyProfile.findOne({ user: user._id }).select(
      "_id",
    );
    if (company) {
      await Job.updateMany(
        { company: company._id, status: "open" },
        { $set: { status: "archived" } },
      );
    }
  }

  emitDashboardUpdate({ roles: ["admin"], scope: "users" });

  res.json({ message: "User account archived.", user: user.toSafeObject() });
});

// @route   POST /api/admin/coordinators
// @desc    Admin registers a new coordinator account. Coordinators never self-register.
//          They get read-only access to the student roster — nothing else.
router.post(
  "/coordinators",
  authorize("admin"), authorizeFullAdmin,
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required."),
    body("email").isEmail().withMessage("A valid email is required."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),
    body("monthlyOtp")
      .optional({ checkFalsy: true })
      .matches(/^\d{6}$/)
      .withMessage("Monthly OTP must be 6 digits."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const { fullName, email, password } = req.body;

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res
          .status(409)
          .json({ message: "An account with this email already exists." });
      }

      const tempPassword = password;
      const user = await User.create({
        fullName,
        email: email.toLowerCase(),
        password: tempPassword,
        role: "coordinator",
      });

      await sendMail({
        to: process.env.SMTP_USER || process.env.ADMIN_EMAIL,
        ...adminNewAccountEmail({
          role: "Coordinator",
          fullName,
          email: email.toLowerCase(),
        }),
      });

      emitDashboardUpdate({ roles: ["admin"], scope: "users" });

      res.status(201).json({
        message:
          "Coordinator account created. The temporary password was set during creation — share it with them securely.",
        user: user.toSafeObject(),
      });
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.email) {
        return res
          .status(409)
          .json({ message: "An account with this email already exists." });
      }
      res.status(500).json({
        message: "Failed to create coordinator account.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

// @route   GET /api/admin/coordinators
router.get("/coordinators", authorize("admin"), async (req, res) => {
  const coordinators = await User.find({
    role: "coordinator",
    isArchived: false,
  }).sort({ createdAt: -1 });
  res.json({ coordinators });
});

router.post(
  "/coordinators/:id/reset-password",
  authorize("admin"), authorizeFullAdmin,
  async (req, res) => {
    const coordinator = await User.findOne({
      _id: req.params.id,
      role: "coordinator",
    });
    if (!coordinator)
      return res.status(404).json({ message: "Coordinator not found." });
    const tempPassword = generateTempPassword();
    coordinator.password = tempPassword;
    await coordinator.save();
    res.json({ message: "Coordinator password reset.", tempPassword });
  },
);

router.post(
  "/registrars",
  authorize("admin"), authorizeFullAdmin,
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required."),
    body("email").isEmail().withMessage("A valid email is required."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });
    try {
      const email = req.body.email.toLowerCase();
      if (await User.findOne({ email }))
        return res
          .status(409)
          .json({ message: "An account with this email already exists." });
      const user = await User.create({
        fullName: req.body.fullName,
        email,
        password: req.body.password,
        role: "registrar",
      });

      emitDashboardUpdate({ roles: ["admin"], scope: "users" });

      res.status(201).json({
        message: "Registrar account created.",
        user: user.toSafeObject(),
      });
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.email) {
        return res
          .status(409)
          .json({ message: "An account with this email already exists." });
      }
      res.status(500).json({
        message: "Failed to create registrar account.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

router.get("/registrars/:id", authorize("admin"), async (req, res) => {
  const registrar = await User.findOne({
    _id: req.params.id,
    role: "registrar",
  });
  if (!registrar)
    return res.status(404).json({ message: "Registrar not found." });
  res.json({ registrar: registrar.toSafeObject() });
});

router.put(
  "/registrars/:id",
  authorize("admin"), authorizeFullAdmin,
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required."),
    body("email").isEmail().withMessage("A valid email is required."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });
    const registrar = await User.findOne({
      _id: req.params.id,
      role: "registrar",
    });
    if (!registrar)
      return res.status(404).json({ message: "Registrar not found." });
    const email = req.body.email.toLowerCase();
    const duplicate = await User.findOne({
      email,
      _id: { $ne: registrar._id },
    });
    if (duplicate)
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    registrar.fullName = req.body.fullName.trim();
    registrar.email = email;
    if (req.body.password) registrar.password = req.body.password;
    await registrar.save();
    res.json({ registrar: registrar.toSafeObject() });
  },
);

router.post(
  "/registrars/:id/reset-password",
  authorize("admin"), authorizeFullAdmin,
  async (req, res) => {
    const registrar = await User.findOne({
      _id: req.params.id,
      role: "registrar",
    });
    if (!registrar)
      return res.status(404).json({ message: "Registrar not found." });
    const tempPassword = generateTempPassword();
    registrar.password = tempPassword;
    await registrar.save();
    res.json({ message: "Registrar password reset.", tempPassword });
  },
);

router.delete("/registrars/:id", authorize("admin"), authorizeFullAdmin, async (req, res) => {
  const registrar = await User.findOne({
    _id: req.params.id,
    role: "registrar",
  });
  if (!registrar)
    return res.status(404).json({ message: "Registrar not found." });
  registrar.isActive = false;
  registrar.isArchived = true;
  registrar.archivedAt = new Date();
  await registrar.save();
  res.json({ message: "Registrar account archived." });
});

// @route   POST /api/admin/students
// @desc    Admin creates a new student account — the only way a student account comes into
//          existence. The email must belong to the school's domain, and the admin sets both
//          the student's login password and their goal (required) OJT hours, e.g. 480.
router.post(
  "/students",
  authorize("admin"), authorizeFullAdmin,
  upload.uploadStudentAvatar.single("avatar"),
  scanUploadedFileIfProvided,
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required."),
    body("studentId")
      .trim()
      .matches(/^\d+-\d+$/)
      .withMessage("School ID must use the format 1-230250."),
    body("email")
      .isEmail()
      .withMessage("A valid email is required.")
      .bail()
      .custom((value) =>
        value.toLowerCase().endsWith(`@${STUDENT_EMAIL_DOMAIN}`),
      )
      .withMessage(`Student email must be a @${STUDENT_EMAIL_DOMAIN} address.`),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),
    body("course")
      .optional({ checkFalsy: true })
      .isIn(ALL_PROGRAMS)
      .withMessage("Select a valid course/program."),
    body("requiredOJTHours")
      .optional({ checkFalsy: true })
      .isInt({ min: 0 })
      .withMessage("Goal hours must be a positive number."),
    body("password")
      .optional({ checkFalsy: true })
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const {
        fullName,
        studentId: requestedStudentId,
        email,
        password,
        monthlyOtp: requestedOtp,
        course,
        yearLevel,
        department,
        requiredOJTHours,
      } = req.body;

      const normalizedStudentId = requestedStudentId.trim();
      const normalizedEmail = email.toLowerCase();
      const expectedEmail = `${normalizedStudentId}@${STUDENT_EMAIL_DOMAIN}`;
      if (normalizedEmail !== expectedEmail) {
        return res.status(400).json({
          message: "School email must match the School ID.",
        });
      }

      const [existing, existingProfile] = await Promise.all([
        User.findOne({ email: normalizedEmail }),
        StudentProfile.findOne({ studentId: normalizedStudentId }),
      ]);
      if (existing || existingProfile) {
        return res
          .status(409)
          .json({ message: "That School ID is already registered." });
      }

      const user = await User.create({
        fullName,
        email: normalizedEmail,
        password,
        role: "student",
      });

      const month = getPhilippineMonthString();
      const monthlyOtp =
        requestedOtp || crypto.randomInt(100000, 1000000).toString();
      user.monthlyOtpHash = crypto
        .createHash("sha256")
        .update(monthlyOtp)
        .digest("hex");
      user.monthlyOtpMonth = month;
      await user.save();

      const profile = await StudentProfile.create({
        user: user._id,
        studentId: normalizedStudentId,
        course: course || "",
        yearLevel: yearLevel || "",
        department: department || "",
        requiredOJTHours: requiredOJTHours ? Number(requiredOJTHours) : 0,
      });
      if (req.file) {
        await renameUpload(req.file, profile.studentId);
        profile.avatarUrl = await persistUpload(req.file, {
          folder: "student-profile-photos",
        });
        profile.avatarOriginalName = req.file.originalname;
        profile.avatarMimeType = req.file.mimetype;
        await profile.save();
      }

      await Promise.all([
        sendMail({
          to: process.env.SMTP_USER || process.env.ADMIN_EMAIL,
          ...adminNewAccountEmail({
            role: "Student",
            fullName,
            email: normalizedEmail,
            details: course || department || "Student profile created",
          }),
        }),
        sendMail({
          to: normalizedEmail,
          ...studentMonthlyOtpEmail({ fullName, code: monthlyOtp }),
        }),
      ]);

      emitDashboardUpdate({
        roles: ["admin", "coordinator", "registrar"],
        scope: "students",
      });

      res.status(201).json({
        message:
          "Student account created with a monthly login OTP valid for this month.",
        monthlyOtp,
        user: user.toSafeObject(),
        profile,
      });
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.email) {
        return res
          .status(409)
          .json({ message: "An account with this email already exists." });
      }
      res.status(500).json({
        message: "Failed to create student account.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

// @route   GET /api/admin/students
// @desc    List all students. Admins get the full roster with every profile field; coordinators
//          get a stripped-down roster — identity plus OJT hours only, since that's the entirety
//          of what a coordinator account is allowed to see (no documents, no applications).
router.get("/students", authorize("admin"), async (req, res) => {
  const activeStudentUsers = await User.find({
    role: "student",
    isArchived: false,
  }).select("_id");
  let query = StudentProfile.find({
    user: { $in: activeStudentUsers.map((user) => user._id) },
  })
    .populate("user", "fullName email isActive createdAt")
    .sort({ createdAt: -1 });

  const profiles = await query;
  res.json({ students: profiles });
});

// @route   POST /api/admin/students/:id/reset-otp
// @desc    Generate and send a fresh monthly login OTP for a student.
router.post("/students/:id/reset-otp", authorize("admin"), authorizeFullAdmin, async (req, res) => {
  const profile = await StudentProfile.findById(req.params.id).populate(
    "user",
    "fullName email role isActive isArchived +monthlyOtpHash +monthlyOtpMonth",
  );
  if (!profile || !profile.user || profile.user.role !== "student") {
    return res.status(404).json({ message: "Student account not found." });
  }
  if (!profile.user.isActive || profile.user.isArchived) {
    return res
      .status(400)
      .json({ message: "This student account is disabled." });
  }

  const month = getPhilippineMonthString();
  const code = crypto.randomInt(100000, 1000000).toString();
  profile.user.monthlyOtpHash = crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");
  profile.user.monthlyOtpMonth = month;

  const result = await sendMail({
    to: profile.user.email,
    ...studentMonthlyOtpEmail({ fullName: profile.user.fullName, code }),
  });
  if (result.skipped) {
    await profile.user.save();
    return res.status(503).json({
      message:
        "A monthly login OTP was generated. Email delivery is not configured.",
      monthlyOtp: code,
    });
  }
  if (result.sent === false) {
    return res.status(502).json({
      message: "Unable to send the monthly login OTP email.",
    });
  }
  await profile.user.save();
  res.json({
    message: `A monthly login OTP was sent to ${profile.user.email}.`,
  });
});

// @route   GET /api/admin/students/:id
// @desc    Admins get the full read-only dashboard view: profile, documents, applications, and
//          attendance/OJT-hours history. Coordinators get a deliberately narrow view — the
//          student's identity and their OJT hours progress/attendance log only. No resume,
//          transcript, bio, or application history is ever sent to a coordinator account.
router.get("/students/:id", authorize("admin"), async (req, res) => {
  const profile = await StudentProfile.findById(req.params.id).populate(
    "user",
    "fullName email isActive createdAt lastLoginAt",
  );
  if (!profile) return res.status(404).json({ message: "Student not found." });

  const [attendanceLogs, openLog] = await Promise.all([
    AttendanceLog.find({ student: profile._id, status: "completed" })
      .sort({ timeIn: -1 })
      .limit(20),
    AttendanceLog.findOne({ student: profile._id, status: "open" }),
  ]);

  if (req.user.role === "coordinator") {
    const hoursView = {
      _id: profile._id,
      user: profile.user,
      course: profile.course,
      yearLevel: profile.yearLevel,
      department: profile.department,
      requiredOJTHours: profile.requiredOJTHours,
      completedOJTHours: profile.completedOJTHours,
      isProfileComplete: profile.isProfileComplete,
    };
    return res.json({
      profile: hoursView,
      attendanceLogs,
      openLog,
      restricted: true,
    });
  }

  const applications = await Application.find({ student: profile._id })
    .populate({
      path: "job",
      select: "title department location workSetup status",
    })
    .populate({ path: "company", select: "companyName logoUrl" })
    .sort({ createdAt: -1 });

  res.json({
    profile,
    applications,
    attendanceLogs,
    openLog,
    restricted: false,
  });
});

// Profile pictures are never exposed through /uploads. Only an authenticated admin can
// replace, remove, or view the original file.
router.get("/students/:id/avatar", authorize("admin"), async (req, res) => {
  const profile = await StudentProfile.findById(req.params.id);
  if (!profile || !profile.avatarUrl) {
    return res.status(404).json({ message: "Profile picture not found." });
  }
  return serveFile(res, profile.avatarUrl, {
    mimetype: profile.avatarMimeType,
  });
});

router.post(
  "/students/:id/avatar",
  authorize("admin"), authorizeFullAdmin,
  upload.uploadStudentAvatar.single("avatar"),
  scanUploadedFile,
  async (req, res) => {
    if (!req.file)
      return res.status(400).json({ message: "No file uploaded." });
    const profile = await StudentProfile.findById(req.params.id);
    if (!profile) {
      await removeUploadedFile(
        `/uploads/${req.file.uploadFolder || ""}/${req.file.filename}`,
      );
      return res.status(404).json({ message: "Student not found." });
    }
    if (!(await removeUploadedFile(profile.avatarUrl))) {
      await removeUploadedFile(
        `/uploads/${req.file.uploadFolder || ""}/${req.file.filename}`,
      );
      return res
        .status(500)
        .json({ message: "The old profile picture could not be removed." });
    }
    await renameUpload(req.file, profile.studentId);
    profile.avatarUrl = await persistUpload(req.file, {
      folder: "student-profile-photos",
    });
    profile.avatarOriginalName = req.file.originalname;
    profile.avatarMimeType = req.file.mimetype;
    await profile.save();
    return res.json({ message: "Profile picture updated.", profile });
  },
);

router.delete("/students/:id/avatar", authorize("admin"), authorizeFullAdmin, async (req, res) => {
  const profile = await StudentProfile.findById(req.params.id);
  if (!profile) return res.status(404).json({ message: "Student not found." });
  if (!(await removeUploadedFile(profile.avatarUrl))) {
    return res
      .status(500)
      .json({ message: "The profile picture could not be removed." });
  }
  profile.avatarUrl = "";
  profile.avatarOriginalName = "";
  profile.avatarMimeType = "";
  await profile.save();
  return res.json({ message: "Profile picture removed.", profile });
});

// @route   PUT /api/admin/students/:id
// @desc    Admin edits a student's profile — including reassigning their goal (required) OJT
//          hours, e.g. bumping it to 480.
router.put(
  "/students/:id",
  authorize("admin"), authorizeFullAdmin,
  [
    body("studentId")
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^\d+-\d+$/)
      .withMessage("School ID must use the format 1-230250."),
    body("course")
      .optional({ checkFalsy: true })
      .isIn(ALL_PROGRAMS)
      .withMessage("Select a valid course/program."),
    body("requiredOJTHours")
      .optional({ checkFalsy: true })
      .isInt({ min: 0 })
      .withMessage("Goal hours must be a positive number."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const profile = await StudentProfile.findById(req.params.id);
      if (!profile)
        return res.status(404).json({ message: "Student not found." });
      const user = await User.findById(profile.user);
      if (!user)
        return res.status(404).json({ message: "Student account not found." });

      if (req.body.studentId !== undefined) {
        const studentId = req.body.studentId.trim();
        if (studentId) {
          const duplicate = await StudentProfile.findOne({
            studentId,
            _id: { $ne: profile._id },
          });
          if (duplicate) {
            return res.status(409).json({
              message: "That school ID is already assigned to another student.",
            });
          }
          const syncedEmail = `${studentId}@${STUDENT_EMAIL_DOMAIN}`;
          const emailOwner = await User.findOne({
            email: syncedEmail,
            _id: { $ne: user._id },
          });
          if (emailOwner) {
            return res.status(409).json({
              message: "That School ID is already used by another account.",
            });
          }
          user.email = syncedEmail;
        }
        profile.studentId = studentId;
      }

      const editableFields = [
        "course",
        "yearLevel",
        "department",
        "requiredOJTHours",
        "completedOJTHours",
      ];
      editableFields.forEach((field) => {
        if (req.body[field] !== undefined) profile[field] = req.body[field];
      });
      await profile.save();

      if (req.body.fullName) {
        user.fullName = req.body.fullName;
      }
      if (req.body.password) {
        user.password = req.body.password;
        user.resetPasswordCodeHash = undefined;
        user.resetPasswordExpires = undefined;
        user.resetPasswordAttempts = 0;
        user.failedLoginAttempts = 0;
        user.loginLockedUntil = undefined;
      }
      await user.save();

      emitDashboardUpdate({
        roles: ["admin", "coordinator", "registrar"],
        scope: "students",
      });

      const updated = await StudentProfile.findById(profile._id).populate(
        "user",
        "fullName email isActive",
      );
      res.json({ profile: updated });
    } catch (err) {
      res.status(400).json({
        message: "Failed to update student.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

// @route   PUT /api/admin/students/:id/hours
// @desc    Admin adds or subtracts manual OJT hours for a student's progress total.
router.put(
  "/students/:id/hours",
  authorize("admin"), authorizeFullAdmin,
  [
    body("hours")
      .isFloat({ min: -1000, max: 1000 })
      .withMessage("Enter a valid number of hours to add or subtract."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const profile = await StudentProfile.findById(req.params.id);
      if (!profile)
        return res.status(404).json({ message: "Student not found." });

      const hoursDelta = Number(req.body.hours);
      const nextHours =
        Math.round((profile.completedOJTHours + hoursDelta) * 100) / 100;
      if (nextHours < 0) {
        return res.status(400).json({
          message:
            "Subtracted hours cannot exceed the student's completed hours.",
        });
      }
      profile.completedOJTHours = nextHours;
      await profile.save();

      emitDashboardUpdate({
        users: [profile.user],
        roles: ["coordinator", "registrar"],
        scope: "attendance",
      });

      res.json({
        message: `${Math.abs(hoursDelta)} hour(s) ${hoursDelta >= 0 ? "added" : "subtracted"}.`,
        profile,
      });
    } catch (err) {
      res.status(400).json({
        message: "Failed to update hours.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

// @route   DELETE /api/admin/students/:id
// @desc    Archive the account while retaining every profile, file, application, and attendance record.
router.delete("/students/:id", authorize("admin"), authorizeFullAdmin, async (req, res) => {
  const profile = await StudentProfile.findById(req.params.id);
  if (!profile) return res.status(404).json({ message: "Student not found." });

  await User.findByIdAndUpdate(profile.user, {
    isActive: false,
    isArchived: true,
    archivedAt: new Date(),
  });

  emitDashboardUpdate({
    roles: ["admin", "coordinator", "registrar"],
    scope: "students",
  });

  res.json({ message: "Student account deleted." });
});

// @route   GET /api/admin/companies
router.get("/companies", authorize("admin"), async (req, res) => {
  const companies = await CompanyProfile.find()
    .populate("user", "fullName email isActive isArchived")
    .sort({
      createdAt: -1,
    });

  const activeCompanies = companies.filter(
    (company) => company.user && !company.user.isArchived,
  );

  const companiesWithLogos = activeCompanies.map((company) =>
    company.toObject(),
  );

  res.json({ companies: companiesWithLogos });
});

// @route   PUT /api/admin/companies/:id/verify
router.put("/companies/:id/verify", authorize("admin"), authorizeFullAdmin, async (req, res) => {
  try {
    const { isVerified, verificationNote } = req.body;
    const company = await CompanyProfile.findByIdAndUpdate(
      req.params.id,
      { isVerified, verificationNote: verificationNote || "" },
      { new: true },
    ).populate("user", "email fullName");

    if (!company)
      return res.status(404).json({ message: "Company not found." });

    // Send email to admin with verification status
    const adminEmail = process.env.SMTP_USER || process.env.ADMIN_EMAIL;

    if (isVerified) {
      await sendMail({
        to: adminEmail,
        ...adminCompanyApprovedEmail({
          companyName: company.companyName,
          approvedAt: new Date(),
        }),
      });
    } else {
      await sendMail({
        to: adminEmail,
        ...adminCompanyRejectedEmail({
          companyName: company.companyName,
          rejectionReason: verificationNote || "No reason provided",
          rejectedAt: new Date(),
        }),
      });
    }

    emitDashboardUpdate({ roles: ["admin"], scope: "companies" });

    res.json({ company });
  } catch (err) {
    res.status(400).json({
      message: "Failed to verify company.",
      ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
    });
  }
});

// @route   GET /api/admin/companies/:id
// @desc    Full read-only view of one company's dashboard: profile plus every job posting
//          they've made and how many applicants/slots each has, mirroring what the company
//          itself sees on its own dashboard.
router.get("/companies/:id", authorize("admin"), async (req, res) => {
  const company = await CompanyProfile.findById(req.params.id).populate(
    "user",
    "fullName email isActive createdAt lastLoginAt",
  );
  if (!company) return res.status(404).json({ message: "Company not found." });

  const companyObj = company.toObject();

  const jobs = await Job.find({ company: company._id }).sort({ createdAt: -1 });
  const jobIds = jobs.map((j) => j._id);
  const applicantCounts = await Application.aggregate([
    { $match: { job: { $in: jobIds } } },
    { $group: { _id: "$job", count: { $sum: 1 } } },
  ]);
  const countByJob = Object.fromEntries(
    applicantCounts.map((c) => [String(c._id), c.count]),
  );
  const jobsWithCounts = jobs.map((j) => ({
    ...j.toObject(),
    applicantCount: countByJob[String(j._id)] || 0,
  }));

  res.json({ company: companyObj, jobs: jobsWithCounts });
});

// @route   PUT /api/admin/companies/:id
// @desc    Admin edits company profile information
router.put("/companies/:id", authorize("admin"), authorizeFullAdmin, async (req, res) => {
  try {
    const {
      companyName,
      industry,
      description,
      website,
      address,
      contactPerson,
      contactPhone,
    } = req.body;

    const editableFields = {
      ...(companyName && { companyName }),
      ...(industry && { industry }),
      ...(description && { description }),
      ...(website && { website }),
      ...(address && { address }),
      ...(contactPerson && { contactPerson }),
      ...(contactPhone && { contactPhone }),
    };

    const company = await CompanyProfile.findByIdAndUpdate(
      req.params.id,
      { $set: editableFields },
      { new: true, runValidators: true },
    ).populate("user", "fullName email");

    if (!company)
      return res.status(404).json({ message: "Company not found." });

    console.log(
      `[ASIATECH SYNC] Company profile updated by admin: ${company.companyName}`,
    );
    res.json({ company, message: "Company profile updated successfully." });
  } catch (err) {
    res.status(400).json({
      message: "Failed to update company.",
      ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
    });
  }
});

// @route   DELETE /api/admin/companies/:id
// @desc    Archive a company account while retaining its associated data
router.delete("/companies/:id", authorize("admin"), authorizeFullAdmin, async (req, res) => {
  try {
    const company = await CompanyProfile.findById(req.params.id);
    if (!company)
      return res.status(404).json({ message: "Company not found." });

    const companyName = company.companyName;
    await Job.updateMany(
      { company: company._id, status: "open" },
      { $set: { status: "archived" } },
    );
    await User.findByIdAndUpdate(company.user, {
      isActive: false,
      isArchived: true,
      archivedAt: new Date(),
    });

    console.log(
      `[ASIATECH SYNC] Company account archived by admin: ${companyName}`,
    );
    res.json({
      message: `Company "${companyName}" archived successfully.`,
    });
  } catch (err) {
    res.status(400).json({
      message: "Failed to delete company.",
      ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
    });
  }
});

// @route   GET /api/admin/jobs
router.get("/jobs", authorize("admin"), async (req, res) => {
  const jobs = await Job.find()
    .populate("company", "companyName")
    .sort({ createdAt: -1 });
  res.json({ jobs });
});

// @route   POST /api/admin/admins
// @desc    Full admin creates another admin account (full or read-only).
router.post(
  "/admins",
  authorize("admin"), authorizeFullAdmin,
  authorizeFullAdmin,
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required."),
    body("email").isEmail().withMessage("A valid email is required."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),
    body("adminType")
      .isIn(["full", "read-only"])
      .withMessage("Admin type must be full or read-only."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });
    try {
      const email = req.body.email.toLowerCase();
      const exists = await User.findOne({ email });
      if (exists)
        return res
          .status(400)
          .json({ message: "An account with this email already exists." });
      const admin = await User.create({
        fullName: req.body.fullName.trim(),
        email,
        password: req.body.password,
        role: "admin",
        adminType: req.body.adminType,
        isActive: true,
      });
      recordAudit(req, {
        action: "admin_account.create",
        outcome: "success",
        user: admin,
        details: `Created ${req.body.adminType} admin account`,
      });
      return res.status(201).json({ user: admin.toSafeObject() });
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Failed to create admin account." });
    }
  },
);

// @route   GET /api/admin/admins
// @desc    List all admin accounts (read-only admins can view them too).
router.get("/admins", authorize("admin"), async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).sort({ createdAt: 1 });
    return res.json({ admins: admins.map((admin) => admin.toSafeObject()) });
  } catch (err) {
    return res.status(400).json({ message: "Failed to load admin accounts." });
  }
});

// @route   PUT /api/admin/admins/:id
// @desc    Full admin edits another admin account (details, optional new
//          password, and admin type). Read-only admin accounts included.
router.put(
  "/admins/:id",
  authorize("admin"), authorizeFullAdmin,
  authorizeFullAdmin,
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required."),
    body("email").isEmail().withMessage("A valid email is required."),
    body("password")
      .optional({ checkFalsy: true })
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),
    body("adminType")
      .isIn(["full", "read-only"])
      .withMessage("Admin type must be full or read-only."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });
    try {
      if (req.params.id === String(req.user._id)) {
        return res.status(400).json({
          message: "Use your profile settings to edit your own account.",
        });
      }
      const target = await User.findOne({ _id: req.params.id, role: "admin" });
      if (!target)
        return res.status(404).json({ message: "Admin account not found." });

      const email = req.body.email.toLowerCase();
      const duplicate = await User.findOne({
        email,
        _id: { $ne: target._id },
      });
      if (duplicate) {
        recordAudit(req, {
          action: "admin_account.create",
          outcome: "failure",
          details: `Attempted to update admin to an existing email`,
        });
        return res.status(400).json({
          message:
            "An account with this email already exists. Archive the duplicate admin account first, then save again.",
        });
      }

      // Never leave the system without an active full admin.
      if (target.adminType === "full" && req.body.adminType === "read-only") {
        const otherFullAdmins = await User.countDocuments({
          role: "admin",
          adminType: "full",
          isActive: true,
          _id: { $ne: target._id },
        });
        if (!otherFullAdmins)
          return res.status(400).json({
            message: "At least one active full admin account is required.",
          });
      }

      target.fullName = req.body.fullName.trim();
      target.email = email;
      target.adminType = req.body.adminType;
      if (req.body.password) target.password = req.body.password;
      await target.save();
      recordAudit(req, {
        action: "admin_account.update",
        outcome: "success",
        user: target,
        details: `Updated admin account${req.body.password ? " (password changed)" : ""}${target.adminType === "read-only" ? " [read-only]" : ""}`,
      });
      return res.json({ user: target.toSafeObject() });
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Failed to update admin account." });
    }
  },
);

// @route   PUT /api/admin/admins/:id/archive
// @desc    Full admin archives or restores an admin account. The last
//          active full admin (and your own account) cannot be archived.
router.put(
  "/admins/:id/archive",
  authorize("admin"), authorizeFullAdmin,
  authorizeFullAdmin,
  async (req, res) => {
    try {
      if (req.params.id === String(req.user._id)) {
        recordAudit(req, {
          action: "admin_account.archive",
          outcome: "failure",
          details: "Attempted to archive own admin account",
        });
        return res
          .status(400)
          .json({ message: "You cannot archive your own account." });
      }
      const target = await User.findOne({ _id: req.params.id, role: "admin" });
      if (!target)
        return res.status(404).json({ message: "Admin account not found." });

      if (target.isActive && target.adminType === "full") {
        const otherFullAdmins = await User.countDocuments({
          role: "admin",
          adminType: "full",
          isActive: true,
          _id: { $ne: target._id },
        });
        if (!otherFullAdmins) {
          recordAudit(req, {
            action: "admin_account.archive",
            outcome: "failure",
            user: target,
            details: "Blocked: archiving the last active full admin",
          });
          return res.status(400).json({
            message: "At least one active full admin account is required.",
          });
        }
      }

      target.isActive = !target.isActive;
      await target.save();
      recordAudit(req, {
        action: target.isActive ? "admin_account.restore" : "admin_account.archive",
        outcome: "success",
        user: target,
        details: `${target.isActive ? "Restored" : "Archived"} admin account`,
      });
      return res.json({
        message: `Admin account ${target.isActive ? "restored" : "archived"}.`,
        user: target.toSafeObject(),
      });
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Failed to update admin account." });
    }
  },
);

// @route   PUT /api/admin/students/:studentId/documents/:type/review
// @desc    Full admin / coordinator approves or rejects a student's resume or
//          transcript. Rejections carry a reason back to the student.
router.put(
  "/students/:studentId/documents/:type/review",
  authorize("admin", "coordinator"),
  authorizeFullAdmin,
  [
    body("action")
      .isIn(["approve", "reject"])
      .withMessage("Action must be approve or reject."),
    body("reason").optional({ checkFalsy: true }).trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });
    try {
      const { type } = req.params;
      if (!["resume", "transcript"].includes(type)) {
        return res.status(404).json({ message: "Unknown document type." });
      }
      const profile = await StudentProfile.findById(
        req.params.studentId,
      ).populate("user", "fullName email");
      if (!profile)
        return res.status(404).json({ message: "Student not found." });
      if (type === "resume" && !profile.resumeUrl) {
        return res
          .status(400)
          .json({ message: "This student has not uploaded a resume." });
      }
      if (type === "transcript" && !profile.transcriptUrl) {
        return res
          .status(400)
          .json({ message: "This student has not uploaded a transcript." });
      }

      const status = req.body.action === "approve" ? "approved" : "rejected";
      profile[`${type}Status`] = status;
      profile[`${type}RejectionReason`] =
        req.body.action === "reject"
          ? req.body.reason || "No reason provided."
          : "";
      await profile.save();

      const label = type === "resume" ? "Resume" : "Transcript / COR";
      if (profile.user?._id) {
        createInAppNotification({
          recipientUserId: profile.user._id,
          type: "document",
          title: `${label} ${status}`,
          body:
            status === "approved"
              ? `Your ${label.toLowerCase()} was approved.`
              : `Your ${label.toLowerCase()} was rejected: ${profile[`${type}RejectionReason`]}`,
          link: "/student/profile",
        });
      }
      recordAudit(req, {
        action: "document.review",
        outcome: "success",
        user: profile.user,
        details: `${label} ${req.body.action}d for student`,
      });
      return res.json({ profile });
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Failed to review the document." });
    }
  },
);

module.exports = router;

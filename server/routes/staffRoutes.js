const express = require("express");
const mongoose = require("mongoose");
const StudentProfile = require("../models/StudentProfile");
const AttendanceLog = require("../models/AttendanceLog");
const User = require("../models/User");
const CoordinatorFolder = require("../models/CoordinatorFolder");
const SecurityAuditLog = require("../models/SecurityAuditLog");
const ExcelJS = require("exceljs");
const CompanyProfile = require("../models/CompanyProfile");
const Application = require("../models/Application");
const Job = require("../models/Job");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const PDFDocument = require("pdfkit");
const {
  protect,
  authorize,
  authorizeFullAdmin,
} = require("../middleware/auth");
const { buildArchivePdf } = require("../utils/archivePdf");
const upload = require("../middleware/upload");
const scanUploadedFile = require("../middleware/scanUpload");
const { persistUpload } = require("../utils/persistUpload");
const { emitDashboardUpdate } = require("../utils/socket");
const { notify } = require("../utils/notify");
const { recordAudit } = require("../utils/securityAudit");

const router = express.Router();
router.use(protect);

// The coordinator certificate is optional, so the upload scan only runs when a
// file was actually attached (mirrors scanUploadedFileIfProvided in adminRoutes).
const scanUploadedFileIfProvided = (req, res, next) =>
  req.file ? scanUploadedFile(req, res, next) : next();

// In-memory PIN attempt tracker. Tracks failed PIN attempts per IP address to
// prevent brute-forcing the 4-digit admin PIN. Entries auto-expire after the
// lockout window to avoid unbounded memory growth.
const pinAttempts = new Map();
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

const requireSensitivePin = async (req, res, next) => {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const record = pinAttempts.get(ip);

  // Check lockout
  if (record && record.lockedUntil && record.lockedUntil > now) {
    const minutesLeft = Math.ceil((record.lockedUntil - now) / 60000);
    return res.status(429).json({
      message: `Too many incorrect PIN attempts. Try again in ${minutesLeft} minute(s).`,
    });
  }

  const pin = String(
    req.body?.pin ??
      req.query?.pin ??
      req.headers["x-admin-sensitive-pin"] ??
      "",
  ).trim();

  if (String(process.env.ADMIN_SENSITIVE_PIN || "").trim() !== pin) {
    // Register failed attempt
    const attempts = (record?.attempts || 0) + 1;
    const entry = { attempts, lockedUntil: null };
    if (attempts >= PIN_MAX_ATTEMPTS) {
      entry.lockedUntil = now + PIN_LOCKOUT_MS;
      entry.attempts = 0; // Reset counter after lockout
    }
    pinAttempts.set(ip, entry);
    return res.status(403).json({
      message: "Restricted admin access. Enter the valid security PIN.",
    });
  }

  // Correct PIN — clear any tracked attempts
  pinAttempts.delete(ip);
  next();
};

router.post(
  "/admin/sensitive-access/verify",
  authorize("admin"),
  authorizeFullAdmin,
  async (req, res) => {
    const pin = String(req.body?.pin || "").trim();
    if (!pin) {
      return res.status(400).json({ message: "Admin PIN is required." });
    }

    const expectedPin = String(process.env.ADMIN_SENSITIVE_PIN || "").trim();
    if (pin !== expectedPin) {
      return res.status(403).json({
        message: "Restricted admin access. Enter the valid security PIN.",
      });
    }

    res.json({ ok: true, message: "PIN verified." });
  },
);

const studentQuery = () =>
  StudentProfile.find({
    user: { $exists: true },
  })
    .populate("user", "fullName email isActive isArchived createdAt")
    .sort({ createdAt: -1 });

// A coordinator's scope: every student enrolled in one of the course / programs on the
// coordinator's account, plus any student an admin explicitly assigned to them (legacy
// assignment via PUT /api/admin/students/:id/assign-coordinator keeps working).
const coordinatorScope = (coordinator) => ({
  $or: [
    { course: { $in: coordinator.programs || [] } },
    { coordinator: coordinator._id },
  ],
});

const isInCoordinatorScope = (profile, coordinator) =>
  (coordinator.programs || []).includes(profile.course) ||
  String(profile.coordinator || "") === String(coordinator._id);

router.get(
  "/coordinator/students",
  authorize("coordinator"),
  async (req, res) => {
    const students = (
      await StudentProfile.find({
        user: { $exists: true },
        ...coordinatorScope(req.user),
      })
        .populate("user", "fullName email isActive isArchived createdAt")
        .sort({ createdAt: -1 })
    ).filter((profile) => profile.user && !profile.user.isArchived);
    res.json({ students, programs: req.user.programs || [] });
  },
);

router.get(
  "/coordinator/students/:id",
  authorize("coordinator"),
  async (req, res) => {
    const profile = await StudentProfile.findById(req.params.id).populate(
      "user",
      "fullName email isActive createdAt",
    );
    if (!profile || !isInCoordinatorScope(profile, req.user))
      return res.status(404).json({ message: "Student not found." });
    const attendanceLogs = await AttendanceLog.find({ student: profile._id })
      .sort({ timeIn: -1 })
      .limit(100);
    res.json({ profile, attendanceLogs, applications: [], restricted: false });
  },
);

router.put(
  "/coordinator/students/:id/assessment",
  authorize("coordinator"),
  // Optional certificate: multipart when a file is included, plain JSON otherwise.
  upload.single("certificate"),
  scanUploadedFileIfProvided,
  async (req, res) => {
    const { performanceGrade, evaluation } = req.body;
    const profile = await StudentProfile.findById(req.params.id);
    if (!profile || !isInCoordinatorScope(profile, req.user))
      return res.status(404).json({ message: "Student not found." });
    if (profile.assessmentSubmittedAt)
      return res.status(409).json({
        message: "This student's grade and evaluation are already final.",
      });
    if ((profile.completedOJTHours || 0) < (profile.requiredOJTHours || 0)) {
      return res.status(400).json({
        message:
          "Assessment is available only after the student completes the required OJT hours.",
      });
    }
    if (
      !String(performanceGrade || "").trim() ||
      !String(evaluation || "").trim()
    ) {
      return res
        .status(400)
        .json({ message: "Grade and evaluation are required." });
    }

    const update = {
      performanceGrade: String(performanceGrade).trim(),
      evaluation: String(evaluation).trim(),
      assessmentSubmittedAt: new Date(),
    };

    // Same storage pipeline the company assessment uses; a storage
    // failure must not discard the grade.
    if (req.file) {
      try {
        update.certificateUrl = await persistUpload(req.file, {
          folder: "certificates",
        });
        update.certificateOriginalName = req.file.originalname;
      } catch (err) {
        console.error("Coordinator certificate storage failed:", err.message);
      }
    }

    // Make the one-time submission atomic so concurrent requests cannot overwrite a final assessment.
    const updatedProfile = await StudentProfile.findOneAndUpdate(
      {
        _id: profile._id,
        assessmentSubmittedAt: null,
        $expr: {
          $gte: [
            { $ifNull: ["$completedOJTHours", 0] },
            { $ifNull: ["$requiredOJTHours", 0] },
          ],
        },
      },
      { $set: update },
      { new: true },
    );

    if (!updatedProfile) {
      const currentProfile = await StudentProfile.findById(req.params.id);
      if (currentProfile?.assessmentSubmittedAt) {
        return res.status(409).json({
          message: "This student's grade and evaluation are already final.",
        });
      }
      return res.status(400).json({
        message:
          "Assessment is available only after the student completes the required OJT hours.",
      });
    }

    // Real-time refresh: staff rosters flip to "Assessment complete".
    emitDashboardUpdate({
      users: [updatedProfile.user],
      roles: ["coordinator", "registrar"],
      scope: "assessment",
    });

    res.json({ profile: updatedProfile });
  },
);

// ---------------------------------------------------------------------------
// Coordinator folders — private, named groups of students on the coordinator dashboard.
// Every route is limited to folders owned by the signed-in coordinator, and only students
// inside that coordinator's own scope can ever be added to a folder.
// ---------------------------------------------------------------------------

// Express 4 does not catch rejected promises from async handlers, so wrap each one.
const handle = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("Coordinator folder error:", err.message);
    if (res.headersSent) return next(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  });

const cleanFolderName = (value) =>
  String(value || "").trim().replace(/\s+/g, " ");

const validateFolderName = (name) => {
  if (!name) return "Folder name is required.";
  if (name.length > 60) return "Folder name must be 60 characters or fewer.";
  return "";
};

const findOwnedFolder = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) return null;
  return CoordinatorFolder.findOne({
    _id: req.params.id,
    coordinator: req.user._id,
  });
};

const duplicateNameResponse = (res) =>
  res
    .status(409)
    .json({ message: "You already have a folder with that name." });

router.get(
  "/coordinator/folders",
  authorize("coordinator"),
  handle(async (req, res) => {
    const folders = await CoordinatorFolder.find({
      coordinator: req.user._id,
    })
      .collation({ locale: "en", strength: 2 })
      .sort({ name: 1 })
      .lean();
    res.json({ folders });
  }),
);

router.post(
  "/coordinator/folders",
  authorize("coordinator"),
  handle(async (req, res) => {
    const name = cleanFolderName(req.body?.name);
    const nameError = validateFolderName(name);
    if (nameError) return res.status(400).json({ message: nameError });
    try {
      const folder = await CoordinatorFolder.create({
        coordinator: req.user._id,
        name,
      });
      res.status(201).json({ folder });
    } catch (err) {
      if (err.code === 11000) return duplicateNameResponse(res);
      throw err;
    }
  }),
);

router.put(
  "/coordinator/folders/:id",
  authorize("coordinator"),
  handle(async (req, res) => {
    const name = cleanFolderName(req.body?.name);
    const nameError = validateFolderName(name);
    if (nameError) return res.status(400).json({ message: nameError });
    const folder = await findOwnedFolder(req);
    if (!folder) return res.status(404).json({ message: "Folder not found." });
    folder.name = name;
    try {
      await folder.save();
    } catch (err) {
      if (err.code === 11000) return duplicateNameResponse(res);
      throw err;
    }
    res.json({ folder });
  }),
);

router.delete(
  "/coordinator/folders/:id",
  authorize("coordinator"),
  handle(async (req, res) => {
    const folder = await findOwnedFolder(req);
    if (!folder) return res.status(404).json({ message: "Folder not found." });
    // Only the folder is removed — the students themselves are untouched.
    await folder.deleteOne();
    res.json({ message: "Folder deleted." });
  }),
);

router.post(
  "/coordinator/folders/:id/students",
  authorize("coordinator"),
  handle(async (req, res) => {
    const folder = await findOwnedFolder(req);
    if (!folder) return res.status(404).json({ message: "Folder not found." });

    const requested = Array.isArray(req.body?.studentIds)
      ? [...new Set(req.body.studentIds.map(String))].filter((id) =>
          mongoose.isValidObjectId(id),
        )
      : [];
    if (requested.length === 0) {
      return res
        .status(400)
        .json({ message: "Select at least one student to add." });
    }

    // Only students this coordinator is actually allowed to see can be added.
    const allowed = (
      await StudentProfile.find({
        _id: { $in: requested },
        user: { $exists: true },
        ...coordinatorScope(req.user),
      }).populate("user", "isArchived")
    ).filter((profile) => profile.user && !profile.user.isArchived);
    if (allowed.length === 0) {
      return res.status(400).json({
        message: "None of the selected students are in your programs.",
      });
    }

    const updated = await CoordinatorFolder.findByIdAndUpdate(
      folder._id,
      { $addToSet: { students: { $each: allowed.map((p) => p._id) } } },
      { new: true },
    );
    res.json({ folder: updated });
  }),
);

router.delete(
  "/coordinator/folders/:id/students/:studentId",
  authorize("coordinator"),
  handle(async (req, res) => {
    const folder = await findOwnedFolder(req);
    if (!folder || !mongoose.isValidObjectId(req.params.studentId)) {
      return res.status(404).json({ message: "Folder not found." });
    }
    const updated = await CoordinatorFolder.findByIdAndUpdate(
      folder._id,
      { $pull: { students: req.params.studentId } },
      { new: true },
    );
    res.json({ folder: updated });
  }),
);

router.get("/registrar/students", authorize("registrar"), async (req, res) => {
  const students = (
    await studentQuery().select(
      "user course yearLevel department completedOJTHours requiredOJTHours companyPlacement performanceGrade evaluation certificateUrl certificateOriginalName assessmentSubmittedAt",
    )
  ).filter((profile) => profile.user && !profile.user.isArchived);
  res.json({ students });
});

router.get(
  "/registrar/students/:id",
  authorize("registrar"),
  async (req, res) => {
    const profile = await StudentProfile.findById(req.params.id).populate(
      "user",
      "fullName email isActive isArchived createdAt",
    );
    if (!profile)
      return res.status(404).json({ message: "Student not found." });
    res.json({
      profile: {
        _id: profile._id,
        user: profile.user,
        course: profile.course,
        yearLevel: profile.yearLevel,
        department: profile.department,
        completedOJTHours: profile.completedOJTHours,
        requiredOJTHours: profile.requiredOJTHours,
        companyPlacement: profile.companyPlacement,
        performanceGrade: profile.performanceGrade,
        evaluation: profile.evaluation,
        certificateUrl: profile.assessmentSubmittedAt
          ? profile.certificateUrl
          : "",
        certificateOriginalName: profile.assessmentSubmittedAt
          ? profile.certificateOriginalName
          : "",
        assessmentSubmittedAt: profile.assessmentSubmittedAt,
      },
    });
  },
);

router.get(
  "/admin/archive",
  authorize("admin"),
  authorizeFullAdmin,
  requireSensitivePin,
  async (req, res) => {
    const users = await User.find({ isArchived: true }).sort({
      archivedAt: -1,
    });
    res.json({ users });
  },
);

router.get(
  "/admin/security-audit",
  authorize("admin"),
  authorizeFullAdmin,
  requireSensitivePin,
  async (req, res) => {
    const logs = await SecurityAuditLog.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .populate("user", "fullName email role");
    res.json({ logs });
  },
);

router.get(
  "/admin/security-audit/export",
  authorize("admin"),
  authorizeFullAdmin,
  requireSensitivePin,
  async (req, res) => {
    const logs = await SecurityAuditLog.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .populate("user", "fullName email role");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Security Audit Logs");
    sheet.columns = [
      { header: "Time", key: "time", width: 24 },
      { header: "Action", key: "action", width: 24 },
      { header: "Result", key: "outcome", width: 14 },
      { header: "Account", key: "account", width: 34 },
      { header: "Role", key: "role", width: 16 },
      { header: "IP Address", key: "ipAddress", width: 20 },
      { header: "User Agent", key: "userAgent", width: 48 },
      { header: "Details", key: "details", width: 60 },
    ];
    logs.forEach((log) =>
      sheet.addRow({
        time: log.createdAt ? new Date(log.createdAt).toLocaleString() : "",
        action: log.action,
        outcome: log.outcome,
        account: log.user?.email || log.email || "Unknown",
        role: log.user?.role || log.role || "",
        ipAddress: log.ipAddress || "",
        userAgent: log.userAgent || "",
        details: log.details || "",
      }),
    );
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0B5D3D" },
    };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    const buffer = await workbook.xlsx.writeBuffer();
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        "attachment; filename=asiatech-security-audit.xlsx",
    });
    res.send(buffer);
  },
);

router.get(
  "/admin/archive/export",
  authorize("admin"),
  authorizeFullAdmin,
  requireSensitivePin,
  async (req, res) => {
    const users = await User.find({ isArchived: true }).sort({
      archivedAt: -1,
    });
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=asiatech-archived-users.pdf",
    });
    const document = new PDFDocument({ margin: 50 });
    document.pipe(res);
    document.fontSize(20).font("Helvetica-Bold").text("ASIATECH SYNC");
    document.fontSize(15).text("Archived Users Report");
    document
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#555555")
      .text(`Generated: ${new Date().toLocaleString()}`)
      .text(`Total archived accounts: ${users.length}`);
    document.moveDown();

    users.forEach((user, index) => {
      if (document.y > 700) document.addPage();
      document
        .fillColor("#17633E")
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(`${index + 1}. ${user.fullName}`);
      document
        .fillColor("#222222")
        .fontSize(10)
        .font("Helvetica")
        .text(`Email: ${user.email}`)
        .text(`Role: ${user.role}`)
        .text(
          `Archived: ${user.archivedAt ? new Date(user.archivedAt).toLocaleString() : "-"}`,
        );
      document.moveDown(0.7);
    });

    document.end();
  },
);

const getArchivedUserData = async (id) => {
  const user = await User.findOne({ _id: id, isArchived: true })
    .select(
      "-password -resetPasswordCodeHash -resetPasswordExpires -resetPasswordAttempts -monthlyOtpHash -monthlyOtpMonth -failedLoginAttempts -loginLockedUntil",
    )
    .lean();
  if (!user) return null;
  const [studentProfile, companyProfile] = await Promise.all([
    StudentProfile.findOne({ user: user._id }).lean(),
    CompanyProfile.findOne({ user: user._id }).lean(),
  ]);
  const conversations = await Conversation.find({ participants: user._id })
    .populate("participants", "fullName email role")
    .populate("job", "title")
    .sort({ lastMessageAt: -1 })
    .lean();
  const messages = await Message.find({
    conversation: {
      $in: conversations.map((conversation) => conversation._id),
    },
  })
    .populate("sender", "fullName email")
    .sort({ createdAt: 1 })
    .lean();
  const [applications, attendance, jobs] = await Promise.all([
    studentProfile
      ? Application.find({ student: studentProfile._id })
          .populate("job", "title department")
          .populate("company", "companyName")
          .lean()
      : [],
    studentProfile
      ? AttendanceLog.find({ student: studentProfile._id })
          .sort({ date: -1 })
          .lean()
      : [],
    companyProfile ? Job.find({ company: companyProfile._id }).lean() : [],
  ]);
  return {
    user,
    studentProfile,
    companyProfile,
    applications,
    attendance,
    jobs,
    conversations,
    // Shape each message with an explicit, readable time + date so archive
    // exports always show WHEN every specific message was sent.
    messages: messages.map((message) => ({
      sentAt: new Date(message.createdAt).toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      from:
        message.sender?.fullName ||
        message.sender?.email ||
        "Unknown sender",
      message: message.body,
    })),
  };
};

router.get(
  "/admin/archive/:id",
  authorize("admin"),
  authorizeFullAdmin,
  requireSensitivePin,
  async (req, res) => {
    const data = await getArchivedUserData(req.params.id);
    if (!data)
      return res.status(404).json({ message: "Archived account not found." });
    res.json(data);
  },
);

router.get(
  "/admin/archive/:id/export",
  authorize("admin"),
  authorizeFullAdmin,
  requireSensitivePin,
  async (req, res) => {
    const data = await getArchivedUserData(req.params.id);
    if (!data)
      return res.status(404).json({ message: "Archived account not found." });
    const safeName =
      data.user.fullName.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") ||
      "user";
    const pdf = await buildArchivePdf(data);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}_archive.pdf"`,
    });
    res.send(pdf);
  },
);

router.put(
  "/admin/archive/:id/restore",
  authorize("admin"),
  authorizeFullAdmin,
  requireSensitivePin,
  async (req, res) => {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, isArchived: true },
      { isArchived: false, isActive: true, $unset: { archivedAt: 1 } },
      { new: true },
    );
    if (!user)
      return res.status(404).json({ message: "Archived account not found." });
    res.json({ user: user.toSafeObject() });
  },
);

// ---------------------------------------------------------------------------------------
// OJT transfers
//
// If a student has a problem with the company that approved them, an admin or the
// student's coordinator can ask another company to take them over. The flow is:
//   1. Staff POST /transfer/students/:id  -> a "transfer_pending" application is created
//      for the new company's OJT posting. The student's current placement stays approved.
//   2. The new company confirms (-> approved) or refuses (-> declined) it from its normal
//      applicants list (PUT /api/applications/:id/status, see applicationRoutes.js).
//   3. On confirmation the old placement becomes "transferred" and the slot counts move.
// Coordinators are limited to students in their own programs. Read-only admins can't
// transfer. Completed OJT hours live on the student profile, so they carry over.
// ---------------------------------------------------------------------------------------
const TRANSFER_ROLES = ["admin", "coordinator"];

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Loads the student for a transfer request and enforces the coordinator's scope.
const loadTransferStudent = async (req, res) => {
  const profile = await StudentProfile.findById(req.params.id).populate(
    "user",
    "fullName email isArchived",
  );
  if (
    !profile ||
    !profile.user ||
    profile.user.isArchived ||
    (req.user.role === "coordinator" && !isInCoordinatorScope(profile, req.user))
  ) {
    res.status(404).json({ message: "Student not found." });
    return null;
  }
  return profile;
};

// The student's current approved OJT placement (Full-Time Job approvals are ignored).
const findCurrentOjtPlacement = async (studentId) => {
  const approved = await Application.find({
    student: studentId,
    status: "approved",
  })
    .populate({ path: "job", select: "title jobType" })
    .populate({ path: "company", select: "companyName user" });
  return approved.find((a) => a.job && a.job.jobType !== "Full-Time Job") || null;
};

const placementSummary = (application) =>
  application
    ? {
        _id: application._id,
        status: application.status,
        jobTitle: application.job?.title || "",
        companyName: application.company?.companyName || "",
        companyId: application.company?._id || null,
        requestedAt: application.transfer?.requestedAt || null,
        reason: application.transfer?.reason || "",
      }
    : null;

// @route   GET /api/staff/transfer/students/:id
// @desc    Current OJT placement + any transfer request still waiting on a company.
router.get(
  "/transfer/students/:id",
  authorize(...TRANSFER_ROLES),
  handle(async (req, res) => {
    const profile = await loadTransferStudent(req, res);
    if (!profile) return;
    const [current, pending] = await Promise.all([
      findCurrentOjtPlacement(profile._id),
      Application.findOne({ student: profile._id, status: "transfer_pending" })
        .populate({ path: "job", select: "title" })
        .populate({ path: "company", select: "companyName" }),
    ]);
    res.json({
      current: placementSummary(current),
      pending: placementSummary(pending),
    });
  }),
);

// @route   GET /api/staff/transfer/jobs?q=
// @desc    Open OJT postings that still have a free slot (the possible destinations).
router.get(
  "/transfer/jobs",
  authorize(...TRANSFER_ROLES),
  handle(async (req, res) => {
    const query = {
      status: "open",
      jobType: "OJT",
      $expr: { $lt: ["$slotsFilled", "$slotsAvailable"] },
    };
    const q = String(req.query.q || "").trim().slice(0, 80);
    if (q) query.title = { $regex: escapeRegex(q), $options: "i" };

    const jobs = await Job.find(query)
      .populate("company", "companyName")
      .sort({ createdAt: -1 })
      .limit(100)
      .select("title department company slotsAvailable slotsFilled");
    res.json({
      jobs: jobs.map((job) => ({
        _id: job._id,
        title: job.title,
        department: job.department,
        companyId: job.company?._id,
        companyName: job.company?.companyName || "",
        slotsLeft: Math.max(job.slotsAvailable - job.slotsFilled, 0),
      })),
    });
  }),
);

// @route   POST /api/staff/transfer/students/:id   { jobId, reason }
// @desc    Ask another company to take over a student's OJT placement.
router.post(
  "/transfer/students/:id",
  authorize(...TRANSFER_ROLES),
  authorizeFullAdmin,
  handle(async (req, res) => {
    const reason = String(req.body?.reason || "").trim();
    if (reason.length < 5) {
      return res
        .status(400)
        .json({ message: "Please enter the reason for the transfer." });
    }
    if (reason.length > 1000) {
      return res
        .status(400)
        .json({ message: "The reason must be 1000 characters or fewer." });
    }
    if (!mongoose.isValidObjectId(req.body?.jobId)) {
      return res.status(400).json({ message: "Choose a company posting." });
    }

    const profile = await loadTransferStudent(req, res);
    if (!profile) return;

    const current = await findCurrentOjtPlacement(profile._id);
    if (!current) {
      return res.status(409).json({
        message: "This student has no approved OJT placement to transfer from.",
      });
    }
    if (await Application.exists({ student: profile._id, status: "transfer_pending" })) {
      return res.status(409).json({
        message:
          "A transfer request is already waiting for a company's answer. Cancel it first to send a new one.",
      });
    }

    const job = await Job.findById(req.body.jobId).populate("company", "companyName user");
    if (!job || job.status !== "open" || job.jobType !== "OJT") {
      return res
        .status(400)
        .json({ message: "That posting is not an open OJT opening." });
    }
    if (job.slotsFilled >= job.slotsAvailable) {
      return res.status(400).json({ message: "That posting has no free slots." });
    }
    if (String(job.company._id) === String(current.company._id)) {
      return res.status(400).json({
        message: "Choose a different company from the student's current one.",
      });
    }

    const now = new Date();
    const transfer = {
      fromApplication: current._id,
      requestedBy: req.user._id,
      requestedByRole: req.user.role,
      reason,
      requestedAt: now,
    };
    const historyEntry = {
      status: "transfer_pending",
      note: `Transfer requested by ${req.user.role} ${req.user.fullName || ""} from ${current.company.companyName}. Reason: ${reason}`.replace(/\s+/g, " "),
    };

    // (job, student) is unique, so a closed-out earlier application is reused.
    let application = await Application.findOne({
      job: job._id,
      student: profile._id,
    });
    if (application) {
      if (!["declined", "withdrawn", "transferred"].includes(application.status)) {
        return res.status(409).json({
          message: "This student already has an application for that posting.",
        });
      }
      application.status = "transfer_pending";
      application.transfer = transfer;
      application.statusHistory.push(historyEntry);
      await application.save();
    } else {
      application = await Application.create({
        job: job._id,
        student: profile._id,
        company: job.company._id,
        coverNote: `Transfer request: ${reason}`.slice(0, 1500),
        status: "transfer_pending",
        transfer,
        statusHistory: [historyEntry],
      });
    }

    const companyUser = job.company.user
      ? await User.findById(job.company.user).select("email fullName")
      : null;
    if (companyUser) {
      notify({
        recipientUserId: companyUser._id,
        recipientEmail: companyUser.email,
        recipientName: companyUser.fullName,
        type: "application_status",
        title: `Transfer request: ${profile.user.fullName}`,
        body: `ASIATECH ${req.user.role} asked you to take over ${profile.user.fullName} for "${job.title}". Please confirm or decline in your applicants list. Reason: ${reason}`,
        link: `/company/jobs/${job._id}/applicants`,
      });
    }
    notify({
      recipientUserId: profile.user._id,
      recipientEmail: profile.user.email,
      recipientName: profile.user.fullName,
      type: "application_status",
      title: "Transfer requested",
      body: `A transfer to ${job.company.companyName} ("${job.title}") was requested for you. Your current placement stays active until that company confirms.`,
      link: "/student/applications",
    });

    recordAudit(req, {
      action: "OJT_TRANSFER_REQUESTED",
      outcome: "success",
      user: req.user,
      details: `Student ${profile.user.email}: ${current.company.companyName} -> ${job.company.companyName} ("${job.title}"). Reason: ${reason}`,
    });

    emitDashboardUpdate({
      users: [profile.user._id, job.company.user],
      roles: ["company", "admin", "coordinator"],
      scope: "applications",
    });

    res.status(201).json({
      message: "Transfer request sent. Waiting for the company to confirm.",
      application,
    });
  }),
);

// @route   DELETE /api/staff/transfer/:applicationId
// @desc    Cancel a transfer request that is still waiting on the company. Admins can
//          cancel any; a coordinator only the ones they sent.
router.delete(
  "/transfer/:applicationId",
  authorize(...TRANSFER_ROLES),
  authorizeFullAdmin,
  handle(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.applicationId)) {
      return res.status(404).json({ message: "Transfer request not found." });
    }
    const application = await Application.findOne({
      _id: req.params.applicationId,
      status: "transfer_pending",
    })
      .populate({ path: "job", select: "title" })
      .populate({ path: "company", select: "user" })
      .populate({ path: "student", select: "user" });
    if (
      !application ||
      (req.user.role === "coordinator" &&
        String(application.transfer?.requestedBy) !== String(req.user._id))
    ) {
      return res.status(404).json({ message: "Transfer request not found." });
    }

    application.status = "withdrawn";
    application.statusHistory.push({
      status: "withdrawn",
      note: `Transfer request cancelled by ${req.user.role}.`,
    });
    await application.save();

    if (application.company?.user) {
      notify({
        recipientUserId: application.company.user,
        type: "application_status",
        title: "Transfer request cancelled",
        body: `The transfer request for "${application.job?.title || "your posting"}" was cancelled.`,
        link: "/company/jobs",
      });
    }
    recordAudit(req, {
      action: "OJT_TRANSFER_CANCELLED",
      outcome: "success",
      user: req.user,
      details: `Application ${application._id}`,
    });
    emitDashboardUpdate({
      users: [application.student?.user, application.company?.user],
      roles: ["company", "admin", "coordinator"],
      scope: "applications",
    });
    res.json({ message: "Transfer request cancelled." });
  }),
);

module.exports = router;

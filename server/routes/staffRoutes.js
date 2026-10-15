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

module.exports = router;

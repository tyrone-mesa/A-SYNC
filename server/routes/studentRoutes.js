const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const StudentProfile = require("../models/StudentProfile");
const AttendanceLog = require("../models/AttendanceLog");
const Application = require("../models/Application");
const CompanyProfile = require("../models/CompanyProfile");
const { protect, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");
const scanUploadedFile = require("../middleware/scanUpload");
const { persistUpload } = require("../utils/persistUpload");
const { removeFile, serveFile } = require("../utils/storage");
const {
  getPhilippineDateString,
  getPhilippineTimeString,
} = require("../utils/philippineTime");
const {
  buildResumePdf,
  buildResumeXlsx,
  buildResumeCsv,
} = require("../utils/exportStudent");

const router = express.Router();

const companyHasStudentApplication = async (companyUserId, studentProfileId) => {
  const company = await CompanyProfile.findOne({ user: companyUserId }).select(
    "_id",
  );
  if (!company) return false;
  return Boolean(
    await Application.exists({
      company: company._id,
      student: studentProfileId,
    }),
  );
};

const sendOjtManual = (req, res) => {
  const manualPath = path.join(__dirname, "../data/ojt-manual.pdf");
  res.type("pdf");

  if (req.query.download === "true") {
    return res.download(manualPath, "asiatech-ojt-manual.pdf");
  }

  res.setHeader(
    "Content-Disposition",
    'inline; filename="asiatech-ojt-manual.pdf"',
  );
  return res.sendFile(manualPath);
};

router.get("/me/ojt-manual", protect, authorize("student"), sendOjtManual);

// @route   GET /api/students/me
// @desc    Get the logged-in student's own profile
router.get("/me", protect, authorize("student"), async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user._id }).populate(
    "user",
    "fullName email",
  );
  if (!profile)
    return res.status(404).json({ message: "Student profile not found." });

  // Lets the apply buttons explain why OJT postings are locked: a student with an approved
  // OJT (or a transfer request in progress) can't apply to another OJT.
  const placements = await Application.find({
    student: profile._id,
    status: { $in: ["approved", "transfer_pending"] },
  })
    .populate({ path: "job", select: "jobType" })
    .select("job status");
  const hasActiveOjtPlacement = placements.some(
    (a) => a.job && a.job.jobType !== "Full-Time Job",
  );

  res.json({ profile, hasActiveOjtPlacement });
});

// @route   PUT /api/students/me
// @desc    Update the logged-in student's profile. Goal/required OJT hours are set by an
//          administrator, not the student, so that field is intentionally excluded here.
router.put("/me", protect, authorize("student"), async (req, res) => {
  try {
    const editableFields = [
      "course",
      "yearLevel",
      "department",
      "skills",
      "bio",
      "phone",
      "address",
    ];

    const updates = {};
    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const profile = await StudentProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: updates },
      { new: true, runValidators: true },
    );

    // Flag profile as complete once all student-editable fields are filled in
    if (profile) {
      profile.isProfileComplete = Boolean(
        profile.course &&
        profile.yearLevel &&
        profile.department &&
        profile.phone &&
        profile.address &&
        profile.bio &&
        profile.skills.length > 0,
      );
      await profile.save();
    }

    res.json({ profile });
  } catch (err) {
    res.status(400).json({
      message: "Failed to update profile.",
      ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
    });
  }
});

// @route   POST /api/students/me/resume
// @desc    Uploads the student's resume. Strictly PDF only (max 5MB) since the file gets
//          emailed straight to companies as an attachment when the student applies.
router.post(
  "/me/resume",
  protect,
  authorize("student"),
  upload.uploadResume.single("resume"),
  scanUploadedFile,
  async (req, res) => {
    if (!req.file)
      return res.status(400).json({ message: "No file uploaded." });

    const profile = await StudentProfile.findOne({ user: req.user._id });
    if (profile?.resumeUrl) await removeFile(profile.resumeUrl);

    const resumeUrl = await persistUpload(req.file, { folder: "resumes" });

    const updatedProfile = await StudentProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        resumeUrl,
        resumeOriginalName: req.file.originalname,
        resumeStatus: "pending",
        resumeRejectionReason: "",
      },
      { new: true },
    );
    res.json({
      message: "Resume uploaded successfully.",
      profile: updatedProfile,
    });
  },
);

router.delete("/me/resume", protect, authorize("student"), async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user._id });
  if (!profile)
    return res.status(404).json({ message: "Student profile not found." });

  const removed = await removeFile(profile.resumeUrl);
  if (!removed) {
    return res
      .status(500)
      .json({ message: "The resume could not be removed from storage." });
  }

  const updatedProfile = await StudentProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      resumeUrl: "",
      resumeOriginalName: "",
      resumeStatus: "none",
      resumeRejectionReason: "",
    },
    { new: true },
  );

  res.json({
    message: "Resume removed successfully.",
    profile: updatedProfile,
  });
});

// @route   GET /api/students/:studentId/resume
// @desc    Serves a resume only to the student, an applicant's company, a coordinator, or an admin
router.get("/:studentId/resume", protect, async (req, res) => {
  const profile = await StudentProfile.findById(req.params.studentId);
  if (!profile || !profile.resumeUrl) {
    return res.status(404).json({ message: "Resume not found." });
  }

  let allowed = req.user.role === "admin" || req.user.role === "coordinator";
  if (req.user.role === "student") {
    allowed = String(profile.user) === String(req.user._id);
  } else if (req.user.role === "company") {
    const CompanyProfile = require("../models/CompanyProfile");
    const Application = require("../models/Application");
    const company = await CompanyProfile.findOne({ user: req.user._id }).select(
      "_id",
    );
    allowed = Boolean(
      company &&
      (await Application.exists({
        company: company._id,
        student: profile._id,
      })),
    );
  }

  if (!allowed) {
    return res
      .status(403)
      .json({ message: "You are not authorized to view this resume." });
  }

  return serveFile(res, profile.resumeUrl, {
    disposition: "attachment",
    filename: profile.resumeOriginalName || "resume.pdf",
  });
});

// @route   POST /api/students/me/transcript
router.post(
  "/me/transcript",
  protect,
  authorize("student"),
  upload.single("transcript"),
  scanUploadedFile,
  async (req, res) => {
    if (!req.file)
      return res.status(400).json({ message: "No file uploaded." });

    const profile = await StudentProfile.findOne({ user: req.user._id });
    if (profile?.transcriptUrl) await removeFile(profile.transcriptUrl);

    const transcriptUrl = await persistUpload(req.file, {
      folder: "transcripts",
    });

    const updatedProfile = await StudentProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        transcriptUrl,
        transcriptOriginalName: req.file.originalname,
        transcriptStatus: "pending",
        transcriptRejectionReason: "",
      },
      { new: true },
    );
    res.json({
      message: "Transcript uploaded successfully.",
      profile: updatedProfile,
    });
  },
);

router.delete(
  "/me/transcript",
  protect,
  authorize("student"),
  async (req, res) => {
    const profile = await StudentProfile.findOne({ user: req.user._id });
    if (!profile)
      return res.status(404).json({ message: "Student profile not found." });

    const removed = await removeFile(profile.transcriptUrl);
    if (!removed) {
      return res
        .status(500)
        .json({ message: "The transcript could not be removed from storage." });
    }

    const updatedProfile = await StudentProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        transcriptUrl: "",
        transcriptOriginalName: "",
        transcriptStatus: "none",
        transcriptRejectionReason: "",
      },
      { new: true },
    );

    res.json({
      message: "Transcript removed successfully.",
      profile: updatedProfile,
    });
  },
);

// Students may view only their own admin-managed profile picture. It is never public.
router.get("/me/avatar", protect, authorize("student"), async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user._id });
  if (!profile || !profile.avatarUrl) {
    return res.status(404).json({ message: "Profile picture not found." });
  }
  return serveFile(res, profile.avatarUrl, {
    mimetype: profile.avatarMimeType,
  });
});

router.get(
  "/:studentId/avatar",
  protect,
  authorize("student"),
  async (req, res) => {
    const profile = await StudentProfile.findById(req.params.studentId);
    if (!profile || String(profile.user) !== String(req.user._id)) {
      return res.status(403).json({
        message: "You are not authorized to view this profile picture.",
      });
    }
    if (!profile.avatarUrl) {
      return res.status(404).json({ message: "Profile picture not found." });
    }
    return serveFile(res, profile.avatarUrl, {
      mimetype: profile.avatarMimeType,
    });
  },
);

// @route   POST /api/students/me/time-in
// @desc    Company-managed attendance: students cannot check in themselves.
router.post("/me/time-in", protect, authorize("student"), async (req, res) => {
  return res.status(403).json({
    message:
      "OJT attendance is managed by the company. Students cannot time in or out themselves.",
  });
});

// @route   POST /api/students/me/time-out
// @desc    Company-managed attendance: students cannot check out themselves.
router.post("/me/time-out", protect, authorize("student"), async (req, res) => {
  return res.status(403).json({
    message:
      "OJT attendance is managed by the company. Students cannot time in or out themselves.",
  });
});

// @route   GET /api/students/me/attendance
// @desc    The student's own attendance history, current open session (if any), and progress
//          toward their admin-assigned goal hours.
router.get(
  "/me/attendance",
  protect,
  authorize("student"),
  async (req, res) => {
    const profile = await StudentProfile.findOne({ user: req.user._id });
    if (!profile)
      return res.status(404).json({ message: "Student profile not found." });

    const [openLog, logs] = await Promise.all([
      AttendanceLog.findOne({ student: profile._id, status: "open" }),
      AttendanceLog.find({ student: profile._id, status: "completed" })
        .sort({ timeIn: -1 })
        .limit(20),
    ]);

    res.json({
      openLog,
      logs,
      completedOJTHours: profile.completedOJTHours,
      requiredOJTHours: profile.requiredOJTHours,
    });
  },
);

// @route   GET /api/students/:id
// @desc    Company/Admin/Coordinator view of a specific student profile
router.get(
  "/:id",
  protect,
  authorize("company", "admin", "coordinator"),
  async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "Student profile not found." });
    const profile = await StudentProfile.findById(req.params.id).populate(
      "user",
      "fullName email",
    );
    if (!profile)
      return res.status(404).json({ message: "Student profile not found." });
    if (
      req.user.role === "company" &&
      !(await companyHasStudentApplication(req.user._id, profile._id))
    )
      return res.status(404).json({ message: "Student profile not found." });
    res.json({ profile });
  },
);

// Shared by both export routes below. `format` comes straight from the URL, so it's
// validated here rather than trusted.
async function sendStudentExport(res, format, profile, user) {
  const safeName = user.fullName.replace(/[^a-z0-9]+/gi, "_");

  if (format === "pdf") {
    const buffer = await buildResumePdf({ profile, user });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}_profile.pdf"`,
    );
    return res.send(buffer);
  }
  if (format === "xlsx") {
    const buffer = await buildResumeXlsx({ profile, user });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}_profile.xlsx"`,
    );
    return res.send(buffer);
  }
  if (format === "csv") {
    const csv = buildResumeCsv({ profile, user });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}_profile.csv"`,
    );
    return res.send(csv);
  }
  return res
    .status(400)
    .json({ message: "Unsupported export format. Use pdf, xlsx, or csv." });
}

// @route   GET /api/students/me/export/:format
// @desc    A student downloading their own profile as a PDF, Excel, or CSV file.
router.get(
  "/me/export/:format",
  protect,
  authorize("student"),
  async (req, res) => {
    try {
      const profile = await StudentProfile.findOne({
        user: req.user._id,
      }).populate("user", "fullName email");
      if (!profile)
        return res.status(404).json({ message: "Student profile not found." });
      await sendStudentExport(res, req.params.format, profile, profile.user);
    } catch (err) {
      res.status(500).json({
        message: "Failed to generate export.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

// @route   GET /api/students/:id/export/:format
// @desc    Same three export formats, for a company/admin/coordinator viewing this specific
//          student — same access rule as GET /:id above, just producing a file instead of JSON.
router.get(
  "/:id/export/:format",
  protect,
  authorize("company", "admin", "coordinator"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return res.status(404).json({ message: "Student profile not found." });
      const profile = await StudentProfile.findById(req.params.id).populate(
        "user",
        "fullName email",
      );
      if (!profile)
        return res.status(404).json({ message: "Student profile not found." });
      if (
        req.user.role === "company" &&
        !(await companyHasStudentApplication(req.user._id, profile._id))
      )
        return res.status(404).json({ message: "Student profile not found." });
      await sendStudentExport(res, req.params.format, profile, profile.user);
    } catch (err) {
      res.status(500).json({
        message: "Failed to generate export.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

module.exports = router;

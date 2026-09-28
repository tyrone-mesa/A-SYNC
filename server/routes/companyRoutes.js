const express = require("express");
const ExcelJS = require("exceljs");
const CompanyProfile = require("../models/CompanyProfile");
const Application = require("../models/Application");
const StudentProfile = require("../models/StudentProfile");
const AttendanceLog = require("../models/AttendanceLog");
const Job = require("../models/Job");
const { protect, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { uploadLogo } = require("../middleware/upload");
const {
  getPhilippineDateString,
  getPhilippineTimeString,
} = require("../utils/philippineTime");
const { createInAppNotification } = require("../utils/notify");
const scanUploadedFile = require("../middleware/scanUpload");
const { persistUpload, renameUpload } = require("../utils/persistUpload");
const { removeFile } = require("../utils/storage");

const router = express.Router();

const formatDtrTime = (date) =>
  date
    ? new Date(date).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : "";

const formatDtrDate = (date) => {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Kept as a thin wrapper so call sites below don't need to change beyond adding "await" —
// actual deletion is provider-aware (local disk or Cloudinary) via utils/storage.js.
const deleteUploadedFile = (fileUrl) => removeFile(fileUrl);

// @route   GET /api/companies/me
router.get("/me", protect, authorize("company"), async (req, res) => {
  const profile = await CompanyProfile.findOne({ user: req.user._id }).populate(
    "user",
    "fullName email",
  );
  if (!profile)
    return res.status(404).json({ message: "Company profile not found." });
  res.json({ profile });
});

// @route   PUT /api/companies/me
router.put("/me", protect, authorize("company"), async (req, res) => {
  try {
    const editableFields = [
      "companyName",
      "industry",
      "description",
      "website",
      "address",
      "contactPerson",
      "contactPhone",
    ];
    const updates = {};
    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const profile = await CompanyProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: updates },
      { new: true, runValidators: true },
    );
    res.json({ profile });
  } catch (err) {
    res.status(400).json({
      message: "Failed to update company profile.",
      ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
    });
  }
});

// @route   POST /api/companies/upload-logo
// @desc    Upload company logo (JPG, JPEG, PNG, max 3MB)
router.post(
  "/upload-logo",
  protect,
  authorize("company"),
  uploadLogo.single("logo"),
  scanUploadedFile,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
      }

      const profile = await CompanyProfile.findOne({ user: req.user._id });
      if (!profile) {
        await deleteUploadedFile(
          `/uploads/${req.file.uploadFolder || ""}/${req.file.filename}`,
        );
        return res.status(404).json({ message: "Company profile not found." });
      }

      // Delete old logo if exists
      if (profile.companyUploadedLogo) {
        await deleteUploadedFile(profile.companyUploadedLogo);
      }

      // Update profile with new logo path (local path or Cloudinary URL, depending on
      // STORAGE_PROVIDER)
      await renameUpload(req.file, profile.companyName);
      profile.companyUploadedLogo = await persistUpload(req.file, {
        folder: "company-logos",
      });
      await profile.save();

      console.log(
        `[ASIATECH SYNC] Company logo uploaded: ${profile.companyName}`,
      );

      res.json({
        message: "Logo uploaded successfully.",
        profile,
      });
    } catch (err) {
      if (req.file) {
        await deleteUploadedFile(`/uploads/${req.file.filename}`);
      }
      res.status(400).json({
        message: "Failed to upload logo.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

// @route   DELETE /api/companies/logo
// @desc    Delete company's uploaded logo
router.delete("/logo", protect, authorize("company"), async (req, res) => {
  try {
    const profile = await CompanyProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: "Company profile not found." });
    }

    if (!profile.companyUploadedLogo) {
      return res.status(400).json({ message: "No logo to delete." });
    }

    await deleteUploadedFile(profile.companyUploadedLogo);
    profile.companyUploadedLogo = "";
    await profile.save();

    console.log(`[ASIATECH SYNC] Company logo deleted: ${profile.companyName}`);

    res.json({
      message: "Logo deleted successfully.",
      profile,
    });
  } catch (err) {
    res.status(400).json({
      message: "Failed to delete logo.",
      ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
    });
  }
});

// @route   GET /api/companies
// @desc    Public directory of verified companies (used for search/browse filters)
router.get("/", async (req, res) => {
  const companies = await CompanyProfile.find({ isVerified: true }).select(
    "companyName industry logoUrl companyUploadedLogo address website",
  );

  const companiesWithLogos = companies.map((company) => company.toObject());

  res.json({ companies: companiesWithLogos });
});

// @route   GET /api/companies/ojt-students/current
router.get(
  "/ojt-students/current",
  protect,
  authorize("company"),
  async (req, res) => {
    try {
      const companyProfile = await CompanyProfile.findOne({
        user: req.user._id,
      });
      if (!companyProfile) {
        return res.status(404).json({ message: "Company profile not found." });
      }

      // Get all OJT jobs for this company
      const ojtJobs = await Job.find({
        company: companyProfile._id,
        jobType: "OJT",
      }).select("_id");
      const jobIds = ojtJobs.map((j) => j._id);

      // Get all approved applications for these jobs
      const acceptedApplications = await Application.find({
        company: companyProfile._id,
        status: "approved",
        job: { $in: jobIds },
      })
        .populate({
          path: "student",
          select:
            "user course department skills phone requiredOJTHours completedOJTHours performanceGrade evaluation assessmentSubmittedAt",
          populate: { path: "user", select: "_id fullName email" },
        })
        .populate({
          path: "job",
          select: "title department",
        })
        .sort({ createdAt: 1 });

      const students = acceptedApplications.map((app) => ({
        applicationId: app._id,
        studentId: app.student._id,
        userId: app.student.user._id,
        fullName: app.student.user.fullName,
        email: app.student.user.email,
        phone: app.student.phone,
        course: app.student.course,
        department: app.student.department,
        skills: app.student.skills,
        requiredOJTHours: app.student.requiredOJTHours || 0,
        completedOJTHours: app.student.completedOJTHours || 0,
        performanceGrade: app.student.performanceGrade || "",
        evaluation: app.student.evaluation || "",
        assessmentSubmittedAt: app.student.assessmentSubmittedAt || null,
        jobTitle: app.job.title,
        jobDepartment: app.job.department,
        acceptedAt: app.createdAt,
      }));

      res.json({ students });
    } catch (err) {
      res.status(400).json({
        message: "Failed to fetch students.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

// @route   GET /api/companies/attendance/student/:studentId
// @desc    Get attendance records for a specific student from this company
router.get(
  "/attendance/student/:studentId",
  protect,
  authorize("company"),
  async (req, res) => {
    try {
      const companyProfile = await CompanyProfile.findOne({
        user: req.user._id,
      });
      if (!companyProfile) {
        return res.status(404).json({ message: "Company profile not found." });
      }

      // Verify student is in approved OJT applications with this company
      const application = await Application.findOne({
        company: companyProfile._id,
        student: req.params.studentId,
        status: "approved",
      });

      if (!application) {
        return res.status(403).json({
          message: "Access denied. Student not found in your OJT roster.",
        });
      }

      const attendanceRecords = await AttendanceLog.find({
        student: req.params.studentId,
        company: companyProfile._id,
      }).sort({ date: -1, timeIn: -1 });

      res.json({ attendanceRecords });
    } catch (err) {
      res.status(400).json({
        message: "Failed to fetch attendance.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

// A completed student's company assessment is an immutable submission.
router.post(
  "/students/:studentId/assessment",
  protect,
  authorize("company"),
  upload.single("certificate"),
  scanUploadedFile,
  async (req, res) => {
    try {
      const companyProfile = await CompanyProfile.findOne({
        user: req.user._id,
      });
      const profile = await StudentProfile.findById(req.params.studentId);
      if (!companyProfile || !profile)
        return res
          .status(404)
          .json({ message: "Student or company profile not found." });
      const application = await Application.findOne({
        company: companyProfile._id,
        student: profile._id,
        status: "approved",
      });
      if (!application)
        return res
          .status(403)
          .json({ message: "Student is not on your approved OJT roster." });
      if ((profile.completedOJTHours || 0) < (profile.requiredOJTHours || 0))
        return res.status(400).json({
          message: "The student must complete the required OJT hours first.",
        });
      if (profile.assessmentSubmittedAt)
        return res.status(409).json({
          message: "This student's grade and evaluation are already final.",
        });
      if (!req.file || !req.body.performanceGrade || !req.body.evaluation)
        return res.status(400).json({
          message: "Certificate, grade, and evaluation are required.",
        });
      profile.performanceGrade = String(req.body.performanceGrade).trim();
      profile.evaluation = String(req.body.evaluation).trim();
      profile.certificateUrl = await persistUpload(req.file, {
        folder: "certificates",
      });
      profile.certificateOriginalName = req.file.originalname;
      profile.assessmentSubmittedAt = new Date();
      profile.assessmentCompany = companyProfile._id;
      profile.companyPlacement = companyProfile.companyName;
      await profile.save();
      res
        .status(201)
        .json({ message: "Assessment submitted and locked.", profile });
    } catch (err) {
      if (req.file) await deleteUploadedFile(`/uploads/${req.file.filename}`);
      res.status(400).json({
        message: "Failed to submit assessment.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

// @route   GET /api/companies/:id
router.get("/:id", async (req, res) => {
  const profile = await CompanyProfile.findById(req.params.id);
  if (!profile) return res.status(404).json({ message: "Company not found." });
  const profileObj = profile.toObject();
  res.json({ profile: profileObj });
});

// @route   GET /api/companies/attendance/student/:studentId/export/:format
// @desc    Export one approved student's Daily Time Record as XLSX or XLS
router.get(
  "/attendance/student/:studentId/export/:format",
  protect,
  authorize("company"),
  async (req, res) => {
    try {
      const format = req.params.format.toLowerCase();
      if (!["xlsx", "xls"].includes(format)) {
        return res.status(400).json({ message: "Format must be xlsx or xls." });
      }

      const companyProfile = await CompanyProfile.findOne({
        user: req.user._id,
      });
      if (!companyProfile) {
        return res.status(404).json({ message: "Company profile not found." });
      }

      const application = await Application.findOne({
        company: companyProfile._id,
        student: req.params.studentId,
        status: "approved",
      }).populate({
        path: "student",
        select: "user",
        populate: { path: "user", select: "fullName" },
      });

      if (!application) {
        return res.status(403).json({
          message: "Access denied. Student not found in your OJT roster.",
        });
      }

      const records = await AttendanceLog.find({
        student: req.params.studentId,
        company: companyProfile._id,
      }).sort({ date: -1, timeIn: -1 });

      const rows = records.map((record) => ({
        studentName: application.student.user.fullName,
        timeIn: formatDtrTime(record.timeIn),
        timeOut: formatDtrTime(record.timeOut) || "Not recorded",
        date: formatDtrDate(record.date),
      }));
      const fileName = `${application.student.user.fullName.replace(/[^a-z0-9]+/gi, "_")}_DTR.${format}`;

      if (format === "xlsx") {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Daily Time Record");
        sheet.columns = [
          { header: "Student Name", key: "studentName", width: 28 },
          { header: "Time In", key: "timeIn", width: 18 },
          { header: "Time Out", key: "timeOut", width: 18 },
          { header: "Date", key: "date", width: 18 },
        ];
        rows.forEach((row) => sheet.addRow(row));
        sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        sheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0B5D3D" },
        };
        const buffer = await workbook.xlsx.writeBuffer();
        res.set({
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        });
        return res.send(buffer);
      }

      const headers = ["Student Name", "Time In", "Time Out", "Date"];
      const tableRows = rows.length
        ? rows
            .map(
              (row) =>
                `<tr>${[row.studentName, row.timeIn, row.timeOut, row.date]
                  .map((value) => `<td>${escapeHtml(value)}</td>`)
                  .join("")}</tr>`,
            )
            .join("")
        : `<tr><td colspan="4">No attendance records yet.</td></tr>`;
      const html = `<table><thead><tr>${headers
        .map((header) => `<th>${header}</th>`)
        .join("")}</tr></thead><tbody>${tableRows}</tbody></table>`;
      res.set({
        "Content-Type": "application/vnd.ms-excel",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      });
      return res.send(html);
    } catch (err) {
      return res.status(400).json({
        message: "Failed to export Daily Time Record.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

// @route   POST /api/companies/attendance/time-in
// @desc    Company records time in for a student
router.post(
  "/attendance/time-in",
  protect,
  authorize("company"),
  async (req, res) => {
    try {
      const { studentId } = req.body;

      // Validate studentId
      if (!studentId) {
        return res.status(400).json({ message: "Student ID is required." });
      }

      const companyProfile = await CompanyProfile.findOne({
        user: req.user._id,
      });

      if (!companyProfile) {
        return res.status(404).json({ message: "Company profile not found." });
      }

      // Verify student is in approved OJT applications with this company
      const application = await Application.findOne({
        company: companyProfile._id,
        student: studentId,
        status: "approved",
      }).populate({
        path: "student",
        select: "_id user",
      });

      if (!application) {
        return res.status(403).json({
          message: "Access denied. Student not found in your OJT roster.",
        });
      }

      const studentProfile = await StudentProfile.findById(studentId).populate(
        "user",
        "_id fullName email",
      );
      if (!studentProfile) {
        return res.status(404).json({ message: "Student profile not found." });
      }

      const now = new Date();
      const dateStr = getPhilippineDateString(now); // YYYY-MM-DD format in PH time

      // Check if student already has an open attendance record for today
      const existingOpen = await AttendanceLog.findOne({
        student: studentId,
        company: companyProfile._id,
        date: dateStr,
        status: "open",
      });

      if (existingOpen) {
        return res.status(400).json({
          message:
            "Student already has an open attendance record for today. Please time out first.",
        });
      }

      const attendance = await AttendanceLog.create({
        student: studentId,
        company: companyProfile._id,
        date: dateStr,
        timeIn: now,
        status: "open",
        companyVerified: true,
      });

      await createInAppNotification({
        recipientUserId: studentProfile.user._id,
        type: "attendance_update",
        title: "OJT Time In recorded",
        body: `Your company recorded your OJT time in at ${getPhilippineTimeString(now)} (PH Time).`,
        link: "/student/dashboard",
      });

      // Populate the student info for response
      const populatedAttendance = await AttendanceLog.findById(
        attendance._id,
      ).populate({
        path: "student",
        select: "user",
        populate: { path: "user", select: "fullName" },
      });

      res.status(201).json({
        message: "Time in recorded successfully.",
        attendance: populatedAttendance,
      });
    } catch (err) {
      console.error("Time In Error:", err);
      res.status(400).json({
        message: "Failed to record time in.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

// @route   POST /api/companies/attendance/time-out
// @desc    Company records time out for a student
router.post(
  "/attendance/time-out",
  protect,
  authorize("company"),
  async (req, res) => {
    try {
      const { attendanceId } = req.body;
      const companyProfile = await CompanyProfile.findOne({
        user: req.user._id,
      });

      if (!companyProfile) {
        return res.status(404).json({ message: "Company profile not found." });
      }

      const attendance = await AttendanceLog.findById(attendanceId).populate({
        path: "student",
        populate: { path: "user", select: "_id fullName email" },
      });

      if (!attendance) {
        return res
          .status(404)
          .json({ message: "Attendance record not found." });
      }

      // Verify this attendance belongs to this company
      if (attendance.company.toString() !== companyProfile._id.toString()) {
        return res.status(403).json({
          message:
            "Access denied. This record does not belong to your company.",
        });
      }

      if (attendance.status !== "open") {
        return res
          .status(400)
          .json({ message: "This attendance record is already closed." });
      }

      const now = new Date();
      attendance.timeOut = now;

      // Calculate hours logged
      const timeInMs = attendance.timeIn.getTime();
      const timeOutMs = now.getTime();
      const hoursLogged = (timeOutMs - timeInMs) / (1000 * 60 * 60); // Convert ms to hours

      attendance.hoursLogged = Math.round(hoursLogged * 100) / 100; // Round to 2 decimals
      attendance.status = "completed";

      await attendance.save();

      // Update student's completed OJT hours
      const studentProfile = await StudentProfile.findById(
        attendance.student._id,
      );
      if (studentProfile) {
        studentProfile.completedOJTHours =
          (studentProfile.completedOJTHours || 0) + attendance.hoursLogged;
        await studentProfile.save();

        await createInAppNotification({
          recipientUserId: attendance.student.user._id,
          type: "attendance_update",
          title: "OJT Time Out recorded",
          body: `Your company recorded your OJT time out at ${getPhilippineTimeString(now)} (PH Time). ${attendance.hoursLogged} hour(s) were added to your total.`,
          link: "/student/dashboard",
        });
      }

      res.json({
        message: "Time out recorded successfully.",
        attendance,
        hoursLogged: attendance.hoursLogged,
      });
    } catch (err) {
      res.status(400).json({
        message: "Failed to record time out.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
    }
  },
);

module.exports = router;

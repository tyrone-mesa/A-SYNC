const express = require("express");
const path = require("path");
const Application = require("../models/Application");
const Job = require("../models/Job");
const StudentProfile = require("../models/StudentProfile");
const CompanyProfile = require("../models/CompanyProfile");
const { protect, authorize } = require("../middleware/auth");
const { sendMail } = require("../utils/mailer");
const {
  newApplicationEmail,
  applicationStatusEmail,
} = require("../utils/emailTemplates");
const { createInAppNotification, notify } = require("../utils/notify");
const { emitDashboardUpdate } = require("../utils/socket");
const { MIN_HOURS_FOR_FULLTIME_JOBS } = require("../config/constants");
const { isRemoteUrl } = require("../utils/storage");

const router = express.Router();

// @route   POST /api/applications
// @desc    Student applies to a job posting. Full-Time Job postings are gated behind a
//          minimum completed-OJT-hours requirement; OJT postings are not.
router.post("/", protect, authorize("student"), async (req, res) => {
  try {
    const { jobId, coverNote } = req.body;

    const job = await Job.findById(jobId).populate("company", "companyName");
    if (!job || job.status !== "open") {
      return res.status(400).json({
        message: "This job posting is not currently accepting applications.",
      });
    }

    if (job.slotsFilled >= job.slotsAvailable) {
      return res.status(400).json({
        message: "This job posting has no remaining slots.",
      });
    }

    const studentProfile = await StudentProfile.findOne({
      user: req.user._id,
    }).populate("user", "fullName email");
    if (!studentProfile || !studentProfile.isProfileComplete) {
      return res
        .status(400)
        .json({ message: "Please complete your profile before applying." });
    }

    if (
      job.jobType === "Full-Time Job" &&
      (studentProfile.completedOJTHours || 0) < MIN_HOURS_FOR_FULLTIME_JOBS
    ) {
      return res.status(403).json({
        message: `Full-Time Job postings require at least ${MIN_HOURS_FOR_FULLTIME_JOBS} completed OJT hours. You currently have ${
          studentProfile.completedOJTHours || 0
        }.`,
      });
    }

    const existing = await Application.findOne({
      job: jobId,
      student: studentProfile._id,
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: "You have already applied to this job." });
    }

    const application = await Application.create({
      job: jobId,
      student: studentProfile._id,
      company: job.company._id,
      coverNote,
      statusHistory: [{ status: "in_review", note: "Application submitted." }],
    });

    // Notify the company by email, attaching the student's resume PDF if one is on file.
    // Email delivery is fire-and-forget — a mail server outage never blocks the application.
    const companyUser = await CompanyProfile.findById(job.company._id).populate(
      "user",
      "email",
    );
    if (companyUser?.user?.email) {
      const { subject, html } = newApplicationEmail({
        companyName: job.company.companyName,
        jobTitle: job.title,
        studentName: studentProfile.user.fullName,
        studentEmail: studentProfile.user.email,
        coverNote,
      });

      const attachments = [];
      if (studentProfile.resumeUrl) {
        // Nodemailer's "path" accepts either a local filesystem path or an http(s) URL —
        // it fetches remote ones itself — so this works whether the resume lives on local
        // disk or was uploaded to Cloudinary (STORAGE_PROVIDER=cloudinary).
        attachments.push({
          filename: studentProfile.resumeOriginalName || "resume.pdf",
          path: isRemoteUrl(studentProfile.resumeUrl)
            ? studentProfile.resumeUrl
            : path.join(
                __dirname,
                "..",
                "uploads",
                path.basename(studentProfile.resumeUrl),
              ),
        });
      }

      sendMail({ to: companyUser.user.email, subject, html, attachments });
      createInAppNotification({
        recipientUserId: companyUser.user._id,
        type: "new_application",
        title: `New applicant: ${studentProfile.user.fullName}`,
        body: `Applied to "${job.title}"`,
        link: `/company/jobs/${job._id}/applicants`,
      });
    }

    res.status(201).json({ application });
  } catch (err) {
    res
      .status(400)
      .json({
        message: "Failed to submit application.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
  }
});

// @route   GET /api/applications/mine
// @desc    Student's own applications with status tracking
router.get("/mine", protect, authorize("student"), async (req, res) => {
  const studentProfile = await StudentProfile.findOne({ user: req.user._id });
  const applications = await Application.find({ student: studentProfile._id })
    .populate({
      path: "job",
      select: "title department location workSetup status jobType",
    })
    .populate({ path: "company", select: "companyName logoUrl" })
    .sort({ createdAt: -1 });
  res.json({ applications });
});

// @route   DELETE /api/applications/:id
// @desc    Student withdraws an application
router.delete("/:id", protect, authorize("student"), async (req, res) => {
  const studentProfile = await StudentProfile.findOne({ user: req.user._id });
  const application = await Application.findOne({
    _id: req.params.id,
    student: studentProfile._id,
  });
  if (!application)
    return res.status(404).json({ message: "Application not found." });

  // Batch 1: withdrawal is only possible before a decision is made.
  if (!["in_review", "interview_scheduled"].includes(application.status)) {
    return res.status(400).json({
      message: "This application can no longer be withdrawn.",
    });
  }

  application.status = "withdrawn";
  application.statusHistory.push({
    status: "withdrawn",
    note: "Withdrawn by student.",
  });
  await application.save();

  const companyProfile = await CompanyProfile.findById(application.company);
  if (companyProfile?.user) {
    createInAppNotification({
      recipientUserId: companyProfile.user,
      type: "application_withdrawn",
      title: "Application withdrawn",
      body: "A student withdrew an application to one of your postings.",
      link: "/company/jobs",
    });
  }

  res.json({ message: "Application withdrawn.", application });
});

// @route   GET /api/applications/job/:jobId
// @desc    Company views all applicants for one of its job postings.
//          Admins can view applicants for any posting (admin company drill-down).
router.get(
  "/job/:jobId",
  protect,
  authorize("company", "admin"),
  async (req, res) => {
  const jobQuery = { _id: req.params.jobId };
  if (req.user.role === "company") {
    const companyProfile = await CompanyProfile.findOne({ user: req.user._id });
    jobQuery.company = companyProfile._id;
  }
  const job = await Job.findOne(jobQuery);
  if (!job)
    return res.status(404).json({ message: "Job posting not found." });

  const applications = await Application.find({ job: job._id })
    .populate({
      path: "student",
      select: "course yearLevel department skills resumeUrl transcriptUrl bio",
      populate: { path: "user", select: "fullName email" },
    })
    .sort({ createdAt: -1 });

  res.json({ job, applications });
});

// @route   PUT /api/applications/:id/status
// @desc    Company updates an applicant's status. Emails the student automatically for
//          In Review, Approved, and Rejected updates (and any other status change).
router.put("/:id/status", protect, authorize("company"), async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = [
      "in_review",
      "interview_scheduled",
      "approved",
      "declined",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    // Batch 1: legal lifecycle transitions are enforced server-side.
    const VALID_TRANSITIONS = {
      in_review: ["interview_scheduled", "approved", "declined"],
      interview_scheduled: ["approved", "declined"],
      approved: ["declined"],
      declined: [],
      withdrawn: [],
    };

    const companyProfile = await CompanyProfile.findOne({ user: req.user._id });
    const application = await Application.findOne({
      _id: req.params.id,
      company: companyProfile._id,
    })
      .populate({ path: "job", select: "title" })
      .populate({
        path: "student",
        populate: { path: "user", select: "fullName email" },
      });
    if (!application)
      return res.status(404).json({ message: "Application not found." });

    if (
      !VALID_TRANSITIONS[application.status] ||
      !VALID_TRANSITIONS[application.status].includes(status)
    ) {
      return res.status(400).json({
        message: `Cannot move an application from "${application.status.replace(/_/g, " ")}" to "${status.replace(/_/g, " ")}".`,
      });
    }

    const wasApproved = application.status === "approved";
    application.status = status;
    application.statusHistory.push({ status, note: note || "" });
    await application.save();

    // Keep slot counts in sync when a candidate is approved or un-approved
    if (status === "approved" && !wasApproved) {
      await Job.findByIdAndUpdate(application.job._id, {
        $inc: { slotsFilled: 1 },
      });
    } else if (wasApproved && status !== "approved") {
      await Job.findByIdAndUpdate(application.job._id, {
        $inc: { slotsFilled: -1 },
      });
    }

    if (application.student?.user?.email) {
      const { subject, html } = applicationStatusEmail({
        studentName: application.student.user.fullName,
        jobTitle: application.job.title,
        companyName: companyProfile.companyName,
        status,
        note,
      });
      sendMail({ to: application.student.user.email, subject, html });
      createInAppNotification({
        recipientUserId: application.student.user._id,
        type: "application_status",
        title: `Application update: ${application.job.title}`,
        body: `Your application status changed to "${status.replace("_", " ")}".`,
        link: "/student/applications",
      });
    }

    // Real-time: the student's dashboard sees it instantly and every online
    // company's applicant list refreshes.
    emitDashboardUpdate({
      users: [application.student?.user?._id],
      roles: ["company"],
      scope: "applications",
    });

    res.json({ application });
  } catch (err) {
    res.status(400).json({
      message: "Failed to update application status.",
      ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
    });
  }
});

module.exports = router;

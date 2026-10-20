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

    // One OJT at a time: once a student has an approved OJT placement (or a transfer
    // request is waiting for a company's answer) they cannot apply to another OJT posting.
    // Full-Time Job postings are unaffected — they have their own 300-hour gate above.
    // Moving to a different company goes through an admin/coordinator transfer instead.
    if (job.jobType !== "Full-Time Job") {
      const activePlacements = await Application.find({
        student: studentProfile._id,
        status: { $in: ["approved", "transfer_pending"] },
      }).populate({ path: "job", select: "jobType" });
      const hasOjtPlacement = activePlacements.some(
        (a) => a.job && a.job.jobType !== "Full-Time Job",
      );
      if (hasOjtPlacement) {
        return res.status(403).json({
          message:
            "You already have an approved OJT placement, so you can't apply to another OJT. If you have a problem with your current company, ask your coordinator or the admin office to transfer you.",
        });
      }
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
      select:
        "course yearLevel department skills resumeUrl resumeOriginalName transcriptUrl transcriptOriginalName bio",
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
      // A transfer request: the new company either takes the student over or refuses.
      transfer_pending: ["approved", "declined"],
      declined: [],
      withdrawn: [],
      transferred: [],
    };

    const companyProfile = await CompanyProfile.findOne({ user: req.user._id });
    const application = await Application.findOne({
      _id: req.params.id,
      company: companyProfile._id,
    })
      .populate({ path: "job", select: "title jobType slotsAvailable slotsFilled" })
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

    const isTransfer = application.status === "transfer_pending";
    const isOjtApproval =
      status === "approved" && application.job?.jobType !== "Full-Time Job";

    if (isOjtApproval) {
      // A student can only hold one approved OJT. (For a transfer, the placement being
      // replaced is allowed — it is closed out below once this company confirms.)
      const otherApproved = await Application.find({
        student: application.student._id,
        _id: { $ne: application._id },
        status: "approved",
      }).populate({ path: "job", select: "jobType" });
      const conflict = otherApproved.find(
        (a) =>
          a.job?.jobType !== "Full-Time Job" &&
          !(
            isTransfer &&
            String(a._id) === String(application.transfer?.fromApplication)
          ),
      );
      if (conflict) {
        return res.status(409).json({
          message:
            "This student already has an approved OJT placement at another company. Ask the admin office or coordinator to transfer them.",
        });
      }
    }

    if (isTransfer && status === "approved") {
      const freshJob = await Job.findById(application.job._id);
      if (!freshJob || freshJob.slotsFilled >= freshJob.slotsAvailable) {
        return res.status(409).json({
          message: "This posting has no remaining slots to accept the transfer.",
        });
      }
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

    // Transfer confirmed: close out the old placement and tell everyone involved.
    if (isTransfer && status === "approved") {
      const old = await Application.findById(
        application.transfer?.fromApplication,
      )
        .populate({ path: "job", select: "title" })
        .populate({ path: "company", select: "companyName user" });
      if (old && old.status === "approved") {
        old.status = "transferred";
        old.transferredToApplication = application._id;
        old.statusHistory.push({
          status: "transferred",
          note: `Transferred to ${companyProfile.companyName}.${
            application.transfer?.reason
              ? ` Reason: ${application.transfer.reason}`
              : ""
          }`,
        });
        await old.save();
        await Job.findByIdAndUpdate(old.job._id, {
          $inc: { slotsFilled: -1 },
        });
        if (old.company?.user) {
          createInAppNotification({
            recipientUserId: old.company.user,
            type: "application_status",
            title: "Intern transferred",
            body: `${application.student?.user?.fullName || "A student"} was transferred from your company to ${companyProfile.companyName}.`,
            link: "/company/dashboard",
          });
        }
      }
    }

    // A student holds one OJT at a time: once an OJT is approved, withdraw any of their
    // other still-open OJT applications.
    if (isOjtApproval) {
      const stillOpen = await Application.find({
        student: application.student._id,
        _id: { $ne: application._id },
        status: { $in: ["in_review", "interview_scheduled"] },
      }).populate({ path: "job", select: "jobType" });
      for (const other of stillOpen) {
        if (other.job?.jobType === "Full-Time Job") continue;
        other.status = "withdrawn";
        other.statusHistory.push({
          status: "withdrawn",
          note: "Closed automatically: the student was placed in another OJT.",
        });
        await other.save();
      }
    }

    if (isTransfer) {
      const verb = status === "approved" ? "accepted" : "declined";
      const studentName = application.student?.user?.fullName || "The student";
      if (application.transfer?.requestedBy) {
        notify({
          recipientUserId: application.transfer.requestedBy,
          type: "application_status",
          title: `Transfer ${verb}: ${studentName}`,
          body: `${companyProfile.companyName} ${verb} the transfer request for "${application.job.title}".`,
          link: `${
            application.transfer.requestedByRole === "coordinator"
              ? "/coordinator/students/"
              : "/admin/students/"
          }${application.student._id}`,
        });
      }
      if (status === "approved" && application.student?.user) {
        notify({
          recipientUserId: application.student.user._id,
          recipientEmail: application.student.user.email,
          recipientName: application.student.user.fullName,
          type: "application_status",
          title: "You have been transferred",
          body: `You are now placed at ${companyProfile.companyName} for "${application.job.title}".`,
          link: "/student/applications",
        });
      }
    } else if (application.student?.user?.email) {
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
      roles: isTransfer ? ["company", "admin", "coordinator"] : ["company"],
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

const express = require("express");
const { body, validationResult } = require("express-validator");
const { protect, authorize } = require("../middleware/auth");
const InterviewSchedule = require("../models/InterviewSchedule");
const Application = require("../models/Application");
const CompanyProfile = require("../models/CompanyProfile");
const StudentProfile = require("../models/StudentProfile");
const { createInAppNotification } = require("../utils/notify");

const router = express.Router();
router.use(protect);

// @route   POST /api/interview-schedules
// @desc    Company proposes an interview to an applicant.
router.post(
  "/",
  authorize("company"),
  [
    body("applicationId").notEmpty().withMessage("Application is required."),
    body("proposedDateTime")
      .isISO8601()
      .withMessage("A valid date and time is required."),
    body("mode").isIn(["online", "onsite"]).withMessage("Invalid mode."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });
    try {
      const companyProfile = await CompanyProfile.findOne({
        user: req.user._id,
      });
      const application = await Application.findOne({
        _id: req.body.applicationId,
        company: companyProfile._id,
      }).populate("student", "user");
      if (!application)
        return res
          .status(404)
          .json({ message: "Application not found." });

      if (!["in_review", "interview_scheduled"].includes(application.status)) {
        return res.status(400).json({
          message:
            "Interviews can only be scheduled for applications under review.",
        });
      }

      const schedule = await InterviewSchedule.create({
        application: application._id,
        job: application.job,
        company: companyProfile._id,
        student: application.student._id,
        proposedDateTime: req.body.proposedDateTime,
        mode: req.body.mode,
        locationOrLink: req.body.locationOrLink || "",
        notes: req.body.notes || "",
      });

      // Tie into the Batch 1 lifecycle.
      if (application.status !== "interview_scheduled") {
        application.status = "interview_scheduled";
        application.statusHistory.push({
          status: "interview_scheduled",
          note: "Interview proposed by company.",
        });
        await application.save();
      }

      const studentProfile = await StudentProfile.findById(
        application.student._id,
      );
      if (studentProfile?.user) {
        createInAppNotification({
          recipientUserId: studentProfile.user,
          type: "interview",
          title: "Interview scheduled",
          body: "A company proposed an interview. Please confirm or request a reschedule.",
          link: "/student/interviews",
        });
      }

      return res.status(201).json({ schedule });
    } catch (err) {
      return res.status(400).json({ message: "Failed to schedule interview." });
    }
  },
);

// @route   GET /api/interview-schedules/student
// @desc    Student lists their interview requests (active + history).
router.get("/student", authorize("student"), async (req, res) => {
  try {
    const studentProfile = await StudentProfile.findOne({ user: req.user._id });
    const schedules = await InterviewSchedule.find({
      student: studentProfile._id,
    })
      .populate("job", "title")
      .populate("company", "companyName")
      .sort({ createdAt: -1 });
    return res.json({ schedules });
  } catch (err) {
    return res.status(400).json({ message: "Failed to load interviews." });
  }
});

// @route   GET /api/interview-schedules/company
// @desc    Company lists schedules for its postings.
router.get("/company", authorize("company", "admin"), async (req, res) => {
  try {
    const query = {};
    if (req.user.role === "company") {
      const companyProfile = await CompanyProfile.findOne({
        user: req.user._id,
      });
      query.company = companyProfile._id;
    }
    const schedules = await InterviewSchedule.find(query)
      .populate("job", "title")
      .populate({
        path: "student",
        populate: { path: "user", select: "fullName email" },
      })
      .sort({ createdAt: -1 });
    return res.json({ schedules });
  } catch (err) {
    return res.status(400).json({ message: "Failed to load interviews." });
  }
});

// @route   PUT /api/interview-schedules/:id/confirm
// @desc    Student confirms a proposed interview.
router.put("/:id/confirm", authorize("student"), async (req, res) => {
  try {
    const studentProfile = await StudentProfile.findOne({ user: req.user._id });
    const schedule = await InterviewSchedule.findOne({
      _id: req.params.id,
      student: studentProfile._id,
    });
    if (!schedule)
      return res.status(404).json({ message: "Interview not found." });
    if (schedule.status !== "proposed") {
      return res
        .status(400)
        .json({ message: "This interview can no longer be confirmed." });
    }
    schedule.status = "confirmed";
    schedule.confirmedAt = new Date();
    await schedule.save();

    const companyProfile = await CompanyProfile.findById(schedule.company);
    if (companyProfile?.user) {
      createInAppNotification({
        recipientUserId: companyProfile.user,
        type: "interview",
        title: "Interview confirmed",
        body: "A student confirmed an interview request.",
        link: "/company/jobs",
      });
    }
    return res.json({ schedule });
  } catch (err) {
    return res.status(400).json({ message: "Failed to confirm interview." });
  }
});

// @route   PUT /api/interview-schedules/:id/reschedule
// @desc    Student requests a reschedule with a preferred new time.
router.put(
  "/:id/reschedule",
  authorize("student"),
  [body("newDateTime").isISO8601().withMessage("A valid date and time is required.")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });
    try {
      const studentProfile = await StudentProfile.findOne({
        user: req.user._id,
      });
      const schedule = await InterviewSchedule.findOne({
        _id: req.params.id,
        student: studentProfile._id,
      });
      if (!schedule)
        return res.status(404).json({ message: "Interview not found." });
      if (!["proposed", "confirmed"].includes(schedule.status)) {
        return res.status(400).json({
          message: "This interview can no longer be rescheduled.",
        });
      }
      schedule.status = "reschedule_requested";
      schedule.rescheduleDateTime = req.body.newDateTime;
      schedule.rescheduleNote = req.body.note || "";
      await schedule.save();

      const companyProfile = await CompanyProfile.findById(schedule.company);
      if (companyProfile?.user) {
        createInAppNotification({
          recipientUserId: companyProfile.user,
          type: "interview",
          title: "Reschedule requested",
          body: "A student requested a new interview time.",
          link: "/company/jobs",
        });
      }
      return res.json({ schedule });
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Failed to request reschedule." });
    }
  },
);

// @route   PUT /api/interview-schedules/:id/rebook
// @desc    Company answers a reschedule request with a new proposal.
router.put(
  "/:id/rebook",
  authorize("company"),
  [body("newDateTime").isISO8601().withMessage("A valid date and time is required.")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });
    try {
      const companyProfile = await CompanyProfile.findOne({
        user: req.user._id,
      });
      const schedule = await InterviewSchedule.findOne({
        _id: req.params.id,
        company: companyProfile._id,
      });
      if (!schedule)
        return res.status(404).json({ message: "Interview not found." });
      if (schedule.status !== "reschedule_requested") {
        return res.status(400).json({
          message: "This interview has no pending reschedule request.",
        });
      }
      schedule.status = "proposed";
      schedule.proposedDateTime = req.body.newDateTime;
      schedule.notes = req.body.note || schedule.notes;
      schedule.rescheduleDateTime = undefined;
      schedule.rescheduleNote = "";
      await schedule.save();

      const studentProfile = await StudentProfile.findById(schedule.student);
      if (studentProfile?.user) {
        createInAppNotification({
          recipientUserId: studentProfile.user,
          type: "interview",
          title: "New interview time proposed",
          body: "A company proposed a new interview time.",
          link: "/student/interviews",
        });
      }
      return res.json({ schedule });
    } catch (err) {
      return res.status(400).json({ message: "Failed to rebook interview." });
    }
  },
);

// @route   PUT /api/interview-schedules/:id/complete
// @desc    Company marks the interview as completed.
router.put("/:id/complete", authorize("company"), async (req, res) => {
  try {
    const companyProfile = await CompanyProfile.findOne({ user: req.user._id });
    const schedule = await InterviewSchedule.findOne({
      _id: req.params.id,
      company: companyProfile._id,
    });
    if (!schedule)
      return res.status(404).json({ message: "Interview not found." });
    if (schedule.status !== "confirmed") {
      return res
        .status(400)
        .json({ message: "Only confirmed interviews can be completed." });
    }
    schedule.status = "completed";
    await schedule.save();
    return res.json({ schedule });
  } catch (err) {
    return res.status(400).json({ message: "Failed to complete interview." });
  }
});

// @route   PUT /api/interview-schedules/:id/cancel
// @desc    Either party cancels; application returns to under review.
router.put("/:id/cancel", authorize("company", "student"), async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role === "company") {
      const companyProfile = await CompanyProfile.findOne({
        user: req.user._id,
      });
      query.company = companyProfile._id;
    } else {
      const studentProfile = await StudentProfile.findOne({
        user: req.user._id,
      });
      query.student = studentProfile._id;
    }
    const schedule = await InterviewSchedule.findOne(query);
    if (!schedule)
      return res.status(404).json({ message: "Interview not found." });
    if (["completed", "cancelled"].includes(schedule.status)) {
      return res
        .status(400)
        .json({ message: "This interview is already closed." });
    }
    schedule.status = "cancelled";
    await schedule.save();

    const application = await Application.findById(schedule.application);
    if (application && application.status === "interview_scheduled") {
      application.status = "in_review";
      application.statusHistory.push({
        status: "in_review",
        note: "Interview cancelled.",
      });
      await application.save();
    }
    return res.json({ schedule });
  } catch (err) {
    return res.status(400).json({ message: "Failed to cancel interview." });
  }
});

module.exports = router;

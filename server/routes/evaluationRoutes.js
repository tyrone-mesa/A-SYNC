const express = require("express");
const { body, validationResult } = require("express-validator");
const { protect, authorize } = require("../middleware/auth");
const Evaluation = require("../models/Evaluation");
const StudentProfile = require("../models/StudentProfile");
const CompanyProfile = require("../models/CompanyProfile");
const Application = require("../models/Application");
const { createInAppNotification } = require("../utils/notify");

const router = express.Router();
router.use(protect);

const RATING_KEYS = [
  "workQuality",
  "productivity",
  "communication",
  "punctuality",
  "teamwork",
  "initiative",
];

const validators = [
  ...RATING_KEYS.map((key) =>
    body(`ratings.${key}`)
      .isInt({ min: 1, max: 5 })
      .withMessage("Each rating must be between 1 and 5."),
  ),
  body("recommendation")
    .isIn([
      "highly_recommend",
      "recommend",
      "recommend_with_reservations",
      "do_not_recommend",
    ])
    .withMessage("Invalid recommendation."),
  body("status").isIn(["draft", "final"]).withMessage("Invalid status."),
];

// Verifies the company has an approved application from this student.
const verifyTrainee = async (req, res, studentId) => {
  const companyProfile = await CompanyProfile.findOne({ user: req.user._id });
  const approved = await Application.exists({
    student: studentId,
    company: companyProfile._id,
    status: "approved",
  });
  if (!approved) {
    res.status(403).json({
      message: "You can only evaluate your accepted trainees.",
    });
    return null;
  }
  return companyProfile;
};

// @route   POST /api/evaluations
// @desc    Company creates an evaluation (draft or final) for a trainee.
router.post("/", authorize("company"), validators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ message: errors.array()[0].msg });
  try {
    const companyProfile = await verifyTrainee(req, res, req.body.studentId);
    if (!companyProfile) return;

    if (req.body.status === "final") {
      const existing = await Evaluation.exists({
        student: req.body.studentId,
        company: companyProfile._id,
        status: "final",
      });
      if (existing) {
        return res.status(400).json({
          message: "A final evaluation already exists for this trainee.",
        });
      }
    }

    const evaluation = await Evaluation.create({
      student: req.body.studentId,
      company: companyProfile._id,
      ratings: req.body.ratings,
      strengths: req.body.strengths || "",
      improvements: req.body.improvements || "",
      overallComments: req.body.overallComments || "",
      recommendation: req.body.recommendation,
      status: req.body.status,
      submittedAt: req.body.status === "final" ? new Date() : undefined,
    });

    if (req.body.status === "final") {
      const studentProfile = await StudentProfile.findById(req.body.studentId);
      if (studentProfile?.user) {
        createInAppNotification({
          recipientUserId: studentProfile.user,
          type: "evaluation",
          title: "OJT evaluation submitted",
          body: "Your host company submitted your OJT evaluation.",
          link: "/student/evaluation",
        });
      }
    }
    return res.status(201).json({ evaluation });
  } catch (err) {
    return res.status(400).json({ message: "Failed to save the evaluation." });
  }
});

// @route   PUT /api/evaluations/:id
// @desc    Company edits its own DRAFT evaluation or promotes it to final.
router.put("/:id", authorize("company"), validators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ message: errors.array()[0].msg });
  try {
    const companyProfile = await CompanyProfile.findOne({
      user: req.user._id,
    });
    const evaluation = await Evaluation.findOne({
      _id: req.params.id,
      company: companyProfile._id,
    });
    if (!evaluation)
      return res.status(404).json({ message: "Evaluation not found." });
    if (evaluation.status === "final") {
      return res
        .status(400)
        .json({ message: "A final evaluation can no longer be edited." });
    }

    if (req.body.status === "final") {
      const existing = await Evaluation.exists({
        student: evaluation.student,
        company: companyProfile._id,
        status: "final",
        _id: { $ne: evaluation._id },
      });
      if (existing) {
        return res.status(400).json({
          message: "A final evaluation already exists for this trainee.",
        });
      }
    }

    evaluation.ratings = req.body.ratings;
    evaluation.strengths = req.body.strengths || "";
    evaluation.improvements = req.body.improvements || "";
    evaluation.overallComments = req.body.overallComments || "";
    evaluation.recommendation = req.body.recommendation;
    evaluation.status = req.body.status;
    if (req.body.status === "final") evaluation.submittedAt = new Date();
    await evaluation.save();

    if (req.body.status === "final") {
      const studentProfile = await StudentProfile.findById(evaluation.student);
      if (studentProfile?.user) {
        createInAppNotification({
          recipientUserId: studentProfile.user,
          type: "evaluation",
          title: "OJT evaluation submitted",
          body: "Your host company submitted your OJT evaluation.",
          link: "/student/evaluation",
        });
      }
    }
    return res.json({ evaluation });
  } catch (err) {
    return res
      .status(400)
      .json({ message: "Failed to update the evaluation." });
  }
});

// @route   GET /api/evaluations/company
// @desc    Company lists its evaluations with trainee names.
router.get("/company", authorize("company"), async (req, res) => {
  try {
    const companyProfile = await CompanyProfile.findOne({
      user: req.user._id,
    });
    const evaluations = await Evaluation.find({
      company: companyProfile._id,
    }).populate({
      path: "student",
      populate: { path: "user", select: "fullName email" },
    });
    return res.json({ evaluations });
  } catch (err) {
    return res.status(400).json({ message: "Failed to load evaluations." });
  }
});

// @route   GET /api/evaluations/of-student/:studentId
// @desc    Reviewers read a student's evaluations (admins, coordinators,
//          registrars). The company reads its own via /company.
router.get(
  "/of-student/:studentId",
  authorize("admin", "coordinator", "registrar"),
  async (req, res) => {
    try {
      const evaluations = await Evaluation.find({
        student: req.params.studentId,
      }).populate({
        path: "company",
        select: "companyName",
      });
      return res.json({ evaluations });
    } catch (err) {
      return res.status(400).json({ message: "Failed to load evaluations." });
    }
  },
);

// @route   GET /api/evaluations/mine
// @desc    Student reads their own evaluations (finals are the record).
router.get("/mine", authorize("student"), async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ user: req.user._id });
    const evaluations = await Evaluation.find({
      student: profile._id,
    }).populate("company", "companyName");
    return res.json({ evaluations });
  } catch (err) {
    return res.status(400).json({ message: "Failed to load evaluations." });
  }
});

// @route   GET /api/evaluations/trainees
// @desc    Company lists accepted trainees (for the evaluation page).
router.get("/trainees", authorize("company"), async (req, res) => {
  try {
    const companyProfile = await CompanyProfile.findOne({
      user: req.user._id,
    });
    const applications = await Application.find({
      company: companyProfile._id,
      status: "approved",
    }).populate({
      path: "student",
      populate: { path: "user", select: "fullName email" },
    });
    const trainees = applications
      .map((a) => a.student)
      .filter((s) => s && s.user);
    return res.json({ trainees });
  } catch (err) {
    return res.status(400).json({ message: "Failed to load trainees." });
  }
});

module.exports = router;

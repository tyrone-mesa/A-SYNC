const express = require("express");
const { protect, authorize, authorizeFullAdmin } = require("../middleware/auth");
const StudentProfile = require("../models/StudentProfile");
const JournalEntry = require("../models/JournalEntry");
// Optional until the evaluation module (Batch 5) merges - the requirement
// simply reports unmet when the model is absent.
let Evaluation = null;
try {
  Evaluation = require("../models/Evaluation");
} catch (err) {
  Evaluation = null;
}
const { createInAppNotification } = require("../utils/notify");
const { recordAudit } = require("../utils/securityAudit");

const router = express.Router();
router.use(protect);

// Batch 6: server-calculated OJT completion checklist + percentage.
const buildCompletion = async (profile) => {
  const requiredHours = profile.requiredOJTHours || 480;
  const completedHours = profile.completedOJTHours || 0;

  const requirements = [
    {
      key: "profile",
      label: "Profile complete",
      met: !!profile.isProfileComplete,
    },
    {
      key: "resume",
      label: "Resume approved",
      met: profile.resumeStatus === "approved",
    },
    {
      key: "transcript",
      label: "Transcript / COR approved",
      met: profile.transcriptStatus === "approved",
    },
    {
      key: "hours",
      label: `OJT hours (${completedHours.toFixed(0)}/${requiredHours})`,
      met: completedHours >= requiredHours,
    },
    {
      key: "journal",
      label: "Journal entries submitted",
      met: !!(await JournalEntry.exists({
        student: profile._id,
        status: "submitted",
      })),
    },
    {
      key: "evaluation",
      label: "Final company evaluation",
      met: Evaluation
        ? !!(await Evaluation.exists({
            student: profile._id,
            status: "final",
          }))
        : false,
    },
  ];

  const metCount = requirements.filter((r) => r.met).length;
  const percentage = Math.round((metCount / requirements.length) * 100);
  const state = profile.ojtCompletionVerified
    ? "completed"
    : metCount === requirements.length
      ? "ready_for_review"
      : "in_progress";

  return { requirements, percentage, state };
};

const loadProfile = async (req, res, studentId) => {
  const profile = await StudentProfile.findById(studentId);
  if (!profile) {
    res.status(404).json({ message: "Student not found." });
    return null;
  }
  return profile;
};

// @route   GET /api/completion/mine
// @desc    Student sees their own OJT completion checklist + percentage.
router.get("/mine", authorize("student"), async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ user: req.user._id });
    if (!profile)
      return res.status(404).json({ message: "Profile not found." });
    const completion = await buildCompletion(profile);
    return res.json({
      ...completion,
      verified: profile.ojtCompletionVerified,
      verifiedAt: profile.ojtCompletionVerifiedAt,
    });
  } catch (err) {
    return res.status(400).json({ message: "Failed to load completion." });
  }
});

// @route   GET /api/completion/of-student/:studentId
// @desc    Reviewers (admin/coordinator/registrar) see a student's completion.
router.get(
  "/of-student/:studentId",
  authorize("admin", "coordinator", "registrar"),
  async (req, res) => {
    try {
      const profile = await loadProfile(req, res, req.params.studentId);
      if (!profile) return;
      const completion = await buildCompletion(profile);
      return res.json({
        ...completion,
        verified: profile.ojtCompletionVerified,
        verifiedAt: profile.ojtCompletionVerifiedAt,
      });
    } catch (err) {
      return res.status(400).json({ message: "Failed to load completion." });
    }
  },
);

// @route   PUT /api/completion/verify/:studentId
// @desc    Full admin marks a student's OJT as complete (requires all
//          requirements met first).
router.put(
  "/verify/:studentId",
  authorize("admin"),
  authorizeFullAdmin,
  async (req, res) => {
    try {
      const profile = await loadProfile(req, res, req.params.studentId);
      if (!profile) return;
      if (profile.ojtCompletionVerified) {
        return res
          .status(400)
          .json({ message: "This student is already marked complete." });
      }
      const completion = await buildCompletion(profile);
      if (completion.state !== "ready_for_review") {
        return res.status(400).json({
          message: `Cannot verify yet - ${completion.requirements
            .filter((r) => !r.met)
            .map((r) => r.label)
            .join(", ")} still unmet.`,
        });
      }
      profile.ojtCompletionVerified = true;
      profile.ojtCompletionVerifiedAt = new Date();
      await profile.save();

      if (profile.user) {
        createInAppNotification({
          recipientUserId: profile.user,
          type: "completion",
          title: "OJT completed",
          body: "The admin office verified your OJT completion. Congratulations!",
          link: "/student/dashboard",
        });
      }
      recordAudit(req, {
        action: "ojt.completion.verify",
        outcome: "success",
        details: "Admin verified OJT completion for student",
      });
      return res.json({ verified: true, verifiedAt: profile.ojtCompletionVerifiedAt });
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Failed to verify completion." });
    }
  },
);

module.exports = router;

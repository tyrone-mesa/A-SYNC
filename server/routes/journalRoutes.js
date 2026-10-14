const express = require("express");
const { body, validationResult } = require("express-validator");
const { protect, authorize } = require("../middleware/auth");
const JournalEntry = require("../models/JournalEntry");
const StudentProfile = require("../models/StudentProfile");
const CompanyProfile = require("../models/CompanyProfile");
const Application = require("../models/Application");

const router = express.Router();
router.use(protect);

// @route   POST /api/journals
// @desc    Student creates a journal entry (draft or submitted).
router.post(
  "/",
  authorize("student"),
  [
    body("entryDate").isISO8601().withMessage("A valid entry date is required."),
    body("activities").trim().notEmpty().withMessage("Activities are required."),
    body("status").isIn(["draft", "submitted"]).withMessage("Invalid status."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });
    try {
      const profile = await StudentProfile.findOne({ user: req.user._id });
      const entry = await JournalEntry.create({
        student: profile._id,
        entryDate: req.body.entryDate,
        activities: req.body.activities,
        learnings: req.body.learnings || "",
        status: req.body.status,
      });
      return res.status(201).json({ entry });
    } catch (err) {
      return res.status(400).json({ message: "Failed to save the entry." });
    }
  },
);

// @route   GET /api/journals/mine
// @desc    Student lists their own entries (newest first).
router.get("/mine", authorize("student"), async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ user: req.user._id });
    const entries = await JournalEntry.find({ student: profile._id }).sort({
      entryDate: -1,
    });
    return res.json({ entries });
  } catch (err) {
    return res.status(400).json({ message: "Failed to load journal entries." });
  }
});

// @route   PUT /api/journals/:id
// @desc    Student edits their own entry.
router.put(
  "/:id",
  authorize("student"),
  [
    body("activities").trim().notEmpty().withMessage("Activities are required."),
    body("status").isIn(["draft", "submitted"]).withMessage("Invalid status."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });
    try {
      const profile = await StudentProfile.findOne({ user: req.user._id });
      const entry = await JournalEntry.findOne({
        _id: req.params.id,
        student: profile._id,
      });
      if (!entry)
        return res.status(404).json({ message: "Journal entry not found." });
      entry.activities = req.body.activities;
      entry.learnings = req.body.learnings || "";
      entry.status = req.body.status;
      await entry.save();
      return res.json({ entry });
    } catch (err) {
      return res.status(400).json({ message: "Failed to update the entry." });
    }
  },
);

// @route   DELETE /api/journals/:id
// @desc    Student deletes their own entry.
router.delete("/:id", authorize("student"), async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ user: req.user._id });
    const entry = await JournalEntry.findOneAndDelete({
      _id: req.params.id,
      student: profile._id,
    });
    if (!entry)
      return res.status(404).json({ message: "Journal entry not found." });
    return res.json({ message: "Entry deleted." });
  } catch (err) {
    return res.status(400).json({ message: "Failed to delete the entry." });
  }
});

// @route   GET /api/journals/of-student/:studentId
// @desc    Reviewers read a student's journal: admins, coordinators, registrars,
//          and companies with an approved application from that student.
router.get("/of-student/:studentId", async (req, res) => {
  try {
    if (req.user.role === "student") {
      return res
        .status(403)
        .json({ message: "Students can only read their own journal." });
    }
    if (req.user.role === "company") {
      const companyProfile = await CompanyProfile.findOne({
        user: req.user._id,
      });
      const approved = await Application.exists({
        student: req.params.studentId,
        company: companyProfile._id,
        status: "approved",
      });
      if (!approved) {
        return res.status(403).json({
          message: "You can only review journals of your accepted trainees.",
        });
      }
    }
    const entries = await JournalEntry.find({
      student: req.params.studentId,
    }).sort({ entryDate: -1 });
    return res.json({ entries });
  } catch (err) {
    return res.status(400).json({ message: "Failed to load journal entries." });
  }
});

module.exports = router;

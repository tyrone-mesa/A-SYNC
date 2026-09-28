const express = require('express');
const PDFDocument = require('pdfkit');
const InterviewSession = require('../models/InterviewSession');
const StudentProfile = require('../models/StudentProfile');
const { protect, authorize } = require('../middleware/auth');
const { generateInterviewQuestions, scoreInterviewAnswers } = require('../utils/aiClient');

const router = express.Router();
router.use(protect, authorize('student'));

// @route   POST /api/interview/sessions
// @desc    Generates 3–5 role-specific interview questions for a target job title and saves
//          a new session for the logged-in student.
router.post('/sessions', async (req, res) => {
  try {
    const { jobTitle, department } = req.body;
    if (!jobTitle || !jobTitle.trim()) {
      return res.status(400).json({ message: 'A target job title is required.' });
    }

    const studentProfile = await StudentProfile.findOne({ user: req.user._id });
    if (!studentProfile) return res.status(404).json({ message: 'Student profile not found.' });

    const questions = await generateInterviewQuestions({ jobTitle, department });

    const session = await InterviewSession.create({
      student: studentProfile._id,
      jobTitle,
      department: department || '',
      questions: questions.map((q) => ({ question: q, answer: '', score: null, feedback: '' })),
      status: 'generated',
    });

    res.status(201).json({ session });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to generate interview questions.' });
  }
});

// @route   GET /api/interview/sessions
// @desc    Lists the student's saved interview sessions (most recent first).
router.get('/sessions', async (req, res) => {
  const studentProfile = await StudentProfile.findOne({ user: req.user._id });
  const sessions = await InterviewSession.find({ student: studentProfile._id }).sort({ createdAt: -1 });
  res.json({ sessions });
});

// @route   GET /api/interview/sessions/:id
router.get('/sessions/:id', async (req, res) => {
  const studentProfile = await StudentProfile.findOne({ user: req.user._id });
  const session = await InterviewSession.findOne({ _id: req.params.id, student: studentProfile._id });
  if (!session) return res.status(404).json({ message: 'Session not found.' });
  res.json({ session });
});

// @route   PUT /api/interview/sessions/:id/answers
// @desc    Student submits their answers for scoring. Runs every answer through the AI
//          scoring engine (1–10 per question) and stores an overall feedback summary.
router.put('/sessions/:id/answers', async (req, res) => {
  try {
    const { answers } = req.body; // array of strings, same order/length as session.questions
    const studentProfile = await StudentProfile.findOne({ user: req.user._id });
    const session = await InterviewSession.findOne({ _id: req.params.id, student: studentProfile._id });
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    if (!Array.isArray(answers) || answers.length !== session.questions.length) {
      return res.status(400).json({ message: 'Please answer every question before submitting.' });
    }

    session.questions.forEach((q, i) => {
      q.answer = answers[i] || '';
    });

    const { scores, overallFeedback } = await scoreInterviewAnswers({
      jobTitle: session.jobTitle,
      department: session.department,
      questions: session.questions,
    });

    session.questions.forEach((q, i) => {
      q.score = scores[i]?.score ?? 0;
      q.feedback = scores[i]?.feedback || '';
    });
    session.totalScore = session.questions.reduce((sum, q) => sum + (q.score || 0), 0);
    session.maxScore = session.questions.length * 10;
    session.overallFeedback = overallFeedback || '';
    session.status = 'scored';

    await session.save();
    res.json({ session });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to score interview answers.' });
  }
});

// @route   GET /api/interview/sessions/:id/export
// @desc    Streams a PDF transcript of the session (questions, answers, per-question scores,
//          and the overall feedback summary) for the student to download.
router.get('/sessions/:id/export', async (req, res) => {
  const studentProfile = await StudentProfile.findOne({ user: req.user._id }).populate('user', 'fullName');
  const session = await InterviewSession.findOne({ _id: req.params.id, student: studentProfile._id });
  if (!session) return res.status(404).json({ message: 'Session not found.' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="interview-${session.jobTitle.replace(/[^a-z0-9]+/gi, '-')}.pdf"`
  );

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).fillColor('#17633E').text('ASIATECH SYNC', { continued: false });
  doc.fontSize(14).fillColor('#000000').text('AI Interview Simulator — Session Transcript');
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#555555');
  doc.text(`Student: ${studentProfile.user?.fullName || ''}`);
  doc.text(`Target Role: ${session.jobTitle}${session.department ? ` (${session.department})` : ''}`);
  doc.text(`Date: ${new Date(session.createdAt).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}`);
  if (session.status === 'scored') {
    doc.text(`Overall Score: ${session.totalScore} / ${session.maxScore}`);
  }
  doc.moveDown(1);

  session.questions.forEach((q, i) => {
    doc.fontSize(12).fillColor('#17633E').text(`Q${i + 1}. ${q.question}`);
    doc.fontSize(10).fillColor('#000000').text(`Answer: ${q.answer || '(no answer given)'}`, { indent: 10 });
    if (q.score !== null && q.score !== undefined) {
      doc.fontSize(10).fillColor('#F05B50').text(`Score: ${q.score} / 10`, { indent: 10 });
      doc.fontSize(10).fillColor('#555555').text(`Feedback: ${q.feedback}`, { indent: 10 });
    }
    doc.moveDown(0.8);
  });

  if (session.overallFeedback) {
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#17633E').text('Overall Feedback');
    doc.fontSize(10).fillColor('#000000').text(session.overallFeedback);
  }

  doc.end();
});

// @route   DELETE /api/interview/sessions/:id
// @desc    Deletes a saved simulation session.
router.delete('/sessions/:id', async (req, res) => {
  const studentProfile = await StudentProfile.findOne({ user: req.user._id });
  const session = await InterviewSession.findOneAndDelete({ _id: req.params.id, student: studentProfile._id });
  if (!session) return res.status(404).json({ message: 'Session not found.' });
  res.json({ message: 'Session deleted.' });
});

module.exports = router;

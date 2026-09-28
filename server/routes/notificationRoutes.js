const express = require('express');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/notifications
// @desc    Most recent notifications for the logged-in user (bell dropdown contents)
router.get('/', protect, async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 })
    .limit(30);
  res.json({ notifications });
});

// @route   GET /api/notifications/unread-count
// @desc    Polled periodically by the bell icon to update its badge without opening the dropdown
router.get('/unread-count', protect, async (req, res) => {
  const count = await Notification.countDocuments({ recipient: req.user._id, read: false });
  res.json({ count });
});

// @route   PUT /api/notifications/:id/read
router.put('/:id/read', protect, async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) return res.status(404).json({ message: 'Notification not found.' });
  res.json({ notification });
});

// @route   PUT /api/notifications/read-all
router.put('/read-all', protect, async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
  res.json({ message: 'All notifications marked as read.' });
});

module.exports = router;

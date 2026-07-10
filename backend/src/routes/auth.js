const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { tokenPayloadForUser } = require('../utils/token');
const { sendError } = require('../utils/sendError');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { name: { $regex: new RegExp(`^${email}$`, 'i') } },
      ],
    });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!user.isActive) return res.status(401).json({ message: 'Account deactivated' });

    res.json({
      ...tokenPayloadForUser(user),
    });
  } catch (err) {
    sendError(res, err, 'Login failed. Please try again.');
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    res.json(tokenPayloadForUser(user));
  } catch (err) {
    sendError(res, err, 'Could not load your profile.');
  }
});

router.post('/refresh', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    res.json(tokenPayloadForUser(user));
  } catch (err) {
    sendError(res, err, 'Could not refresh session.');
  }
});

module.exports = router;

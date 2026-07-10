const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, adminOnly, teamViewAccess } = require('../middleware/auth');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { tokenPayloadForUser } = require('../utils/token');
const { sendError } = require('../utils/sendError');
const dashCache = require('../utils/dashboardCache');

router.get('/assignees', protect, async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('name role')
      .sort({ name: 1 })
      .lean();
    res.json(users);
  } catch (err) {
    sendError(res, err);
  }
});

/** Read-only team list for Manager, Stock Manager, Admin */
router.get('/complaint-handlers', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ isActive: true, handlesComplaints: true })
      .select('name email role phone')
      .sort({ name: 1 })
      .lean();
    res.json(users);
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/team', protect, teamViewAccess, async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('name email role phone points')
      .sort({ name: 1 })
      .lean();
    res.json(users);
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    const search = (req.query.search || '').trim();
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({ users, pagination: paginationMeta(page, limit, total) });
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/reset-points', protect, adminOnly, async (req, res) => {
  try {
    await User.updateMany({}, { $set: { points: 0 } });
    dashCache.invalidateCrm();
    const me = await User.findById(req.user._id).select('-password');
    res.json({
      message: 'All reward points reset to 0',
      ...(me ? tokenPayloadForUser(me) : {}),
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/:id/reset-points', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { points: 0 }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    dashCache.invalidateCrm();
    const payload = String(user._id) === String(req.user._id) ? tokenPayloadForUser(user) : {};
    res.json({ ...user.toObject(), ...payload });
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, phone, handlesComplaints } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({
      name, email, password, role: role || 'user', phone,
      handlesComplaints: Boolean(handlesComplaints),
    });
    dashCache.invalidateAdmin();
    res.status(201).json({
      _id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone,
      handlesComplaints: user.handlesComplaints,
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, role, phone, isActive, password, handlesComplaints } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;
    if (handlesComplaints !== undefined) user.handlesComplaints = Boolean(handlesComplaints);
    if (password) user.password = password;

    await user.save();
    dashCache.invalidateAdmin();
    const json = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
      handlesComplaints: user.handlesComplaints,
    };
    if (String(user._id) === String(req.user._id)) {
      Object.assign(json, tokenPayloadForUser(user));
    }
    res.json(json);
  } catch (err) {
    sendError(res, err);
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    dashCache.invalidateAdmin();
    res.json({ message: 'User deleted' });
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;

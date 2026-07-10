const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const {
  protect,
  complaintsAccess,
  canManageAllComplaints,
  isAdmin,
} = require('../middleware/auth');
const { COMPLAINT_CATEGORIES } = require('../constants/complaintCategories');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { sendError } = require('../utils/sendError');
const { sendComplaintConfirmation } = require('../utils/mail');

function buildComplaintFilter(req) {
  const filter = {};
  if (!canManageAllComplaints(req.user)) {
    filter.assignedTo = req.user._id;
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assignedTo && canManageAllComplaints(req.user)) {
    filter.assignedTo = req.query.assignedTo;
  }
  const search = (req.query.search || '').trim();
  if (search) {
    filter.$or = [
      { complaintNumber: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  return filter;
}

function complaintAccessFilter(req) {
  const filter = { _id: req.params.id };
  if (!canManageAllComplaints(req.user)) {
    filter.assignedTo = req.user._id;
  }
  return filter;
}

// Public — categories list
router.get('/categories', (req, res) => {
  res.json({ categories: COMPLAINT_CATEGORIES });
});

// Public — register complaint
router.post('/', async (req, res) => {
  try {
    const { category, name, phone, email, address, description } = req.body;

    if (!category || !name || !phone || !email || !address) {
      return res.status(400).json({ message: 'Name, phone, email, address and issue category are required' });
    }
    if (!COMPLAINT_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Invalid issue category' });
    }

    const complaint = await Complaint.create({
      category,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      address: address.trim(),
      description: (description || '').trim(),
    });

    let emailResult = { sent: false };
    try {
      emailResult = await sendComplaintConfirmation(complaint.toObject());
    } catch (mailErr) {
      console.error('Complaint confirmation email failed:', mailErr.message);
    }

    res.status(201).json({
      message: 'Complaint registered successfully',
      complaint: {
        complaintNumber: complaint.complaintNumber,
        category: complaint.category,
        status: complaint.status,
        createdAt: complaint.createdAt,
      },
      emailSent: emailResult.sent,
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.use(protect, complaintsAccess);

// CRM — list complaints
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, 20, 100);
    const filter = buildComplaintFilter(req);

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate('assignedTo', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    res.json({ complaints, pagination: paginationMeta(page, limit, total) });
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findOne(complaintAccessFilter(req))
      .populate('assignedTo', 'name email phone');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.json(complaint);
  } catch (err) {
    sendError(res, err);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findOne(complaintAccessFilter(req));
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    const { status, internalNote, assignedTo } = req.body;
    const { COMPLAINT_STATUSES } = require('../models/Complaint');

    if (status) {
      if (!COMPLAINT_STATUSES.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      complaint.status = status;
    }
    if (internalNote !== undefined) complaint.internalNote = internalNote;

    if (assignedTo !== undefined && isAdmin(req.user)) {
      const handler = await User.findOne({
        _id: assignedTo,
        isActive: true,
        handlesComplaints: true,
      });
      if (!handler) {
        return res.status(400).json({
          message: 'Assignee must be an active employee with complaint access enabled',
        });
      }
      complaint.assignedTo = handler._id;
    }

    await complaint.save();
    await complaint.populate('assignedTo', 'name email phone');
    res.json(complaint);
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { sendError } = require('../utils/sendError');

// Helper to get YYYY-MM-DD in Asia/Kolkata (IST)
function getISTDateString(d = new Date()) {
  const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(d);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${year}-${month}-${day}`;
}

/**
 * @route   POST /api/attendance/punch
 * @desc    Record a punch (in/out) from external face scanning device
 * @access  Public (Secured with API Key)
 */
router.post('/punch', async (req, res) => {
  try {
    // 1. Authenticate using API Key
    const apiKey = req.headers['x-api-key'] || req.body.apiKey;
    const expectedApiKey = process.env.ATTENDANCE_API_KEY || 'sj_a9d18fce14b8ea92c0192dfd6a2f7c006d9536d5e1825c9b1772fbe75de43c08';
    if (apiKey !== expectedApiKey) {
      return res.status(401).json({ message: 'Unauthorized device access' });
    }

    // 2. Identify the employee
    const { email, phone, userId, empCode } = req.body;
    let filter = null;
    if (userId) {
      filter = { _id: userId };
    } else if (empCode) {
      filter = { empCode: empCode.trim() };
    } else if (email) {
      filter = { email: email.toLowerCase().trim() };
    } else if (phone) {
      filter = { phone: phone.trim() };
    }

    if (!filter) {
      return res.status(400).json({ message: 'Missing employee identification identifier (userId, email, or phone)' });
    }

    const user = await User.findOne(filter);
    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'Employee account is inactive' });
    }

    // 3. Determine today's date in IST
    const now = req.body.timestamp ? new Date(req.body.timestamp) : new Date();
    if (isNaN(now.getTime())) {
      return res.status(400).json({ message: 'Invalid timestamp format. Must be a valid ISO Date/Timestamp string.' });
    }
    const dateStr = getISTDateString(now);

    // 4. Find or create attendance record
    let record = await Attendance.findOne({ user: user._id, date: dateStr });
    let actionMessage = '';

    if (!record) {
      // First punch of the day: check-in
      record = await Attendance.create({
        user: user._id,
        date: dateStr,
        checkIn: now,
        punches: [{ type: 'in', time: now }]
      });
      actionMessage = `Punch-in successful for ${user.name}`;
    } else {
      // Alternate punch type: if last punch was 'in', this is 'out', and vice versa.
      const lastPunch = record.punches[record.punches.length - 1];
      const nextType = (lastPunch && lastPunch.type === 'in') ? 'out' : 'in';

      if (nextType === 'out') {
        record.checkOut = now;
      }
      record.punches.push({ type: nextType, time: now });
      await record.save();
      actionMessage = `${nextType === 'in' ? 'Punch-in' : 'Punch-out'} successful for ${user.name}`;
    }

    res.status(200).json({
      message: actionMessage,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      record
    });

  } catch (err) {
    sendError(res, err);
  }
});

/**
 * @route   GET /api/attendance
 * @desc    Get attendance records (Admin can see all, Employees see their own)
 * @access  Protected
 */
router.get('/', protect, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    // Check if the user is an admin
    const isAdmin = req.user.role === 'admin';

    if (isAdmin) {
      // Admin filter options
      if (req.query.user) {
        filter.user = req.query.user;
      }
      if (req.query.date) {
        filter.date = req.query.date;
      }
      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search.trim(), 'i');
        const matchedUsers = await User.find({ name: searchRegex }).select('_id').lean();
        const matchedUserIds = matchedUsers.map(u => u._id);
        filter.user = { $in: matchedUserIds };
      }
    } else {
      // Non-admins can only see their own attendance
      filter.user = req.user._id;
      // Allow them to filter their own history by date range or specific date
      if (req.query.date) {
        filter.date = req.query.date;
      }
    }

    // Support date range filter if provided
    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) {
        filter.date.$gte = req.query.startDate;
      }
      if (req.query.endDate) {
        filter.date.$lte = req.query.endDate;
      }
    }

    const [attendanceList, total] = await Promise.all([
      Attendance.find(filter)
        .populate('user', 'name email role empCode')
        .sort({ checkIn: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Attendance.countDocuments(filter)
    ]);

    res.json({
      attendance: attendanceList,
      pagination: paginationMeta(page, limit, total)
    });

  } catch (err) {
    sendError(res, err);
  }
});

/**
 * @route   POST /api/attendance
 * @desc    Create manual attendance record (Admin only)
 * @access  Protected, Admin
 */
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { userId, date, checkIn, checkOut } = req.body;
    if (!userId || !checkIn) {
      return res.status(400).json({ message: 'User ID and check-in time are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const dateStr = date || getISTDateString(new Date(checkIn));

    // Check if record already exists for this date
    const exists = await Attendance.findOne({ user: userId, date: dateStr });
    if (exists) {
      return res.status(400).json({ message: 'Attendance record already exists for this user on this date' });
    }

    const punches = [{ type: 'in', time: new Date(checkIn) }];
    if (checkOut) {
      punches.push({ type: 'out', time: new Date(checkOut) });
    }

    const record = await Attendance.create({
      user: userId,
      date: dateStr,
      checkIn: new Date(checkIn),
      checkOut: checkOut ? new Date(checkOut) : null,
      punches
    });

    const populatedRecord = await record.populate('user', 'name email role empCode');
    res.status(201).json(populatedRecord);

  } catch (err) {
    sendError(res, err);
  }
});

/**
 * @route   PUT /api/attendance/:id
 * @desc    Update attendance record (Admin only)
 * @access  Protected, Admin
 */
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { date, checkIn, checkOut } = req.body;
    const record = await Attendance.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    if (date) record.date = date;
    if (checkIn) record.checkIn = new Date(checkIn);
    if (checkOut) {
      record.checkOut = new Date(checkOut);
    } else if (checkOut === null) {
      record.checkOut = null;
    }

    // Rebuild punches based on checkIn and checkOut
    const punches = [{ type: 'in', time: record.checkIn }];
    if (record.checkOut) {
      punches.push({ type: 'out', time: record.checkOut });
    }
    record.punches = punches;

    await record.save();
    const populated = await record.populate('user', 'name email role empCode');
    res.json(populated);

  } catch (err) {
    sendError(res, err);
  }
});

/**
 * @route   DELETE /api/attendance/:id
 * @desc    Delete attendance record (Admin only)
 * @access  Protected, Admin
 */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const record = await Attendance.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    res.json({ message: 'Attendance record deleted' });
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;

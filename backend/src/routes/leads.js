const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const User = require('../models/User');
const { protect, adminOnly, canViewAllLeads } = require('../middleware/auth');
const { upload, uploadMany, destroyMany } = require('../middleware/upload');
const { buildLeadFilter } = require('../utils/leads');
const { tokenPayloadForUser } = require('../utils/token');
const { sendError } = require('../utils/sendError');
const dashCache = require('../utils/dashboardCache');

// Calculate points earned based on days elapsed since stage was entered
// Same day = +5, each extra day -1, can go negative
function calcPoints(stageSinceDate) {
  const now = new Date();
  const since = new Date(stageSinceDate);
  const daysElapsed = Math.floor((now - since) / (1000 * 60 * 60 * 24));
  return 5 - daysElapsed;
}

const LEAD_LIST_FIELDS = [
  { path: 'assignedTo', select: 'name email points' },
  { path: 'createdBy', select: 'name email' },
];

const LEAD_DETAIL_FIELDS = [
  ...LEAD_LIST_FIELDS,
  { path: 'stageHistory.assignedTo', select: 'name email' },
  { path: 'stageHistory.movedBy', select: 'name email' },
  { path: 'notes.addedBy', select: 'name email' },
];

router.get('/', protect, async (req, res) => {
  try {
    const filter = buildLeadFilter(req);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate(LEAD_LIST_FIELDS)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Lead.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    res.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/stages', protect, (req, res) => {
  res.json(Lead.STAGES);
});

// Lightweight stats (prefer GET /dashboard/crm for the CRM dashboard)
router.get('/stats', protect, async (req, res) => {
  try {
    const filter = buildLeadFilter(req);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const aggRows = await Lead.aggregate([
      { $match: filter },
      {
        $facet: {
          summary: [{
            $group: {
              _id: null,
              total: { $sum: 1 },
              commissioned: { $sum: { $cond: [{ $eq: ['$stage', 'Commission'] }, 1, 0] } },
              inProgress: {
                $sum: {
                  $cond: [{
                    $and: [
                      { $ne: ['$stage', 'Lead'] },
                      { $ne: ['$stage', 'Commission'] },
                    ],
                  }, 1, 0],
                },
              },
              newToday: { $sum: { $cond: [{ $gte: ['$createdAt', todayStart] }, 1, 0] } },
            },
          }],
          stageCounts: [{ $group: { _id: '$stage', count: { $sum: 1 } } }],
        },
      },
    ]);

    const facet = aggRows[0] || { summary: [], stageCounts: [] };
    const summary = facet.summary[0] || {
      total: 0, commissioned: 0, inProgress: 0, newToday: 0,
    };
    const stageCounts = Object.fromEntries(Lead.STAGES.map((s) => [s, 0]));
    facet.stageCounts.forEach(({ _id, count }) => {
      if (_id && stageCounts[_id] !== undefined) stageCounts[_id] = count;
    });

    const recent = await Lead.find(filter)
      .populate(LEAD_LIST_FIELDS)
      .sort({ updatedAt: -1 })
      .limit(8);

    res.json({
      total: summary.total,
      stageCounts,
      commissioned: summary.commissioned,
      inProgress: summary.inProgress,
      newToday: summary.newToday,
      recent,
    });
  } catch (err) {
    sendError(res, err);
  }
});

// Leaderboard — sorted by points desc
router.get('/leaderboard', protect, async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select('name email role points').sort({ points: -1 });
    res.json(users);
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/bulk-delete', protect, adminOnly, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids array is required' });
    }
    if (ids.length > 100) {
      return res.status(400).json({ message: 'Maximum 100 leads can be deleted at once' });
    }

    const result = await Lead.deleteMany({ _id: { $in: ids } });
    dashCache.invalidateCrm();
    dashCache.invalidateAdmin();
    res.json({
      message: `${result.deletedCount} lead(s) deleted`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate(LEAD_DETAIL_FIELDS);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { name, phone, email, address, city, requirements, systemSize, source, assignedTo } = req.body;
    const lead = await Lead.create({
      name, phone, email, address, city, requirements, systemSize, source,
      assignedTo: assignedTo || req.user._id,
      createdBy: req.user._id,
      stageHistory: [{
        stage: 'Lead',
        assignedTo: assignedTo || req.user._id,
        movedBy: req.user._id,
        note: 'Lead created',
        date: new Date(),
      }],
    });
    await lead.populate(LEAD_LIST_FIELDS);
    dashCache.invalidateCrm();
    dashCache.invalidateAdmin();
    res.status(201).json(lead);
  } catch (err) {
    sendError(res, err);
  }
});

router.put('/:id/stage', protect, async (req, res) => {
  try {
    const { stage, assignedTo, note } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    // Only award points when actually changing stage (not same stage)
    const isStageChange = lead.stage !== stage;
    let tokenExtras = {};

    if (isStageChange) {
      const lastEntry = lead.stageHistory.length > 0
        ? lead.stageHistory[lead.stageHistory.length - 1]
        : null;
      const stageSince = lastEntry?.date || lead.createdAt;

      const recipientId = (lead.assignedTo || '').toString();
      if (recipientId) {
        const earned = calcPoints(stageSince);
        const updatedUser = await User.findByIdAndUpdate(
          recipientId,
          { $inc: { points: earned } },
          { new: true },
        ).select('-password');
        if (updatedUser && String(updatedUser._id) === String(req.user._id)) {
          tokenExtras = tokenPayloadForUser(updatedUser);
        }
      }
    }

    lead.stage = stage;
    if (assignedTo) lead.assignedTo = assignedTo;

    lead.stageHistory.push({
      stage,
      assignedTo: assignedTo || lead.assignedTo,
      movedBy: req.user._id,
      note: note || `Moved to ${stage}`,
      date: new Date(),
    });

    await lead.save();
    await lead.populate(LEAD_LIST_FIELDS);
    dashCache.invalidateCrm();
    res.json({ ...lead.toObject(), ...tokenExtras });
  } catch (err) {
    sendError(res, err);
  }
});

router.put('/:id/assign', protect, async (req, res) => {
  try {
    const { assignedTo, note } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.assignedTo = assignedTo;
    lead.stageHistory.push({
      stage: lead.stage,
      assignedTo,
      movedBy: req.user._id,
      note: note || 'Lead reassigned',
      date: new Date(),
    });

    await lead.save();
    await lead.populate([{ path: 'assignedTo', select: 'name email points' }]);
    dashCache.invalidateCrm();
    res.json(lead);
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/:id/notes', protect, upload.array('images', 6), async (req, res) => {
  let uploaded = [];
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const text = (req.body.text || '').trim();
    if (!text && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: 'Note must include text or at least one image' });
    }

    if (req.files && req.files.length > 0) {
      uploaded = await uploadMany(req.files, { folder: `solarji/leads/${lead._id}` });
    }

    lead.notes.push({
      text,
      images: uploaded,
      addedBy: req.user._id,
      date: new Date(),
    });
    await lead.save();
    await lead.populate('notes.addedBy', 'name email');
    res.json(lead.notes);
  } catch (err) {
    // Roll back Cloudinary assets if Mongo save failed after upload succeeded
    if (uploaded.length) {
      await destroyMany(uploaded.map((u) => u.publicId));
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Image too large' });
    }
    sendError(res, err);
  }
});

router.delete('/:id/notes/:noteId', protect, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const note = lead.notes.id(req.params.noteId);
    if (!note) return res.status(404).json({ message: 'Note not found' });

    // Only the author or an admin may remove a note
    if (req.user.role !== 'admin' && String(note.addedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed to delete this note' });
    }

    const publicIds = (note.images || []).map((img) => img.publicId).filter(Boolean);
    note.deleteOne();
    await lead.save();
    await destroyMany(publicIds);

    res.json({ message: 'Note deleted' });
  } catch (err) {
    sendError(res, err);
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate(LEAD_LIST_FIELDS);
    res.json(lead);
  } catch (err) {
    sendError(res, err);
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    dashCache.invalidateCrm();
    dashCache.invalidateAdmin();
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;

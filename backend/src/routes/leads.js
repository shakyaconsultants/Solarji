const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { protect, adminOnly, canViewAllLeads } = require('../middleware/auth');
const { upload, uploadMany, destroyMany, compressAndUpload } = require('../middleware/upload');
const { isCloudinaryConfigured } = require('../config/cloudinary');
const { buildLeadFilter } = require('../utils/leads');
const { tokenPayloadForUser } = require('../utils/token');
const { sendError } = require('../utils/sendError');
const dashCache = require('../utils/dashboardCache');
const { sendLeadStageNotification } = require('../utils/mail');

const docFields = [
  { name: 'aadhaar', maxCount: 1 },
  { name: 'pan', maxCount: 1 },
  { name: 'passbook', maxCount: 1 },
  { name: 'houseTax', maxCount: 1 },
  { name: 'electricityBill', maxCount: 1 },
  { name: 'rooftopPhoto', maxCount: 1 },
];

async function processDocUploads(files, leadId) {
  const resultDocs = {};
  if (!files) return resultDocs;

  const docKeys = ['aadhaar', 'pan', 'passbook', 'houseTax', 'electricityBill', 'rooftopPhoto'];

  for (const key of docKeys) {
    if (files[key] && files[key][0]) {
      const file = files[key][0];
      try {
        if (isCloudinaryConfigured()) {
          const uploaded = await compressAndUpload(file, { folder: `solarji/leads/${leadId}/documents` });
          resultDocs[key] = {
            url: uploaded.url,
            publicId: uploaded.publicId,
            originalName: file.originalname,
          };
        } else {
          const b64 = file.buffer.toString('base64');
          const mime = file.mimetype || 'image/jpeg';
          resultDocs[key] = {
            url: `data:${mime};base64,${b64}`,
            publicId: `dev_${Date.now()}`,
            originalName: file.originalname,
          };
        }
      } catch (uploadErr) {
        console.error(`Failed to upload ${key} to Cloudinary, falling back to base64:`, uploadErr);
        const b64 = file.buffer.toString('base64');
        const mime = file.mimetype || 'image/jpeg';
        resultDocs[key] = {
          url: `data:${mime};base64,${b64}`,
          publicId: `fallback_${Date.now()}`,
          originalName: file.originalname,
        };
      }
    }
  }
  return resultDocs;
}

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
  { path: 'payments.recordedBy', select: 'name email' },
];

// Public route - create lead from quotation generator
router.post('/public', async (req, res) => {
  try {
    const { name, phone, email, address, city, requirements, systemSize, source, plantCost } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone number are required' });
    }

    const admin = await User.findOne({ role: 'admin', isActive: true });
    if (!admin) {
      return res.status(500).json({ message: 'No active admin found in the system' });
    }

    const lead = await Lead.create({
      name, phone, email, address, city, requirements, systemSize,
      plantCost: Math.max(0, Number(plantCost) || 0),
      source: source || 'Quotation Generator',
      assignedTo: admin._id,
      createdBy: admin._id,
      stageHistory: [{
        stage: 'Lead',
        assignedTo: admin._id,
        movedBy: admin._id,
        note: `Lead created from ${source || 'Quotation Generator'}`,
        date: new Date(),
      }],
    });

    dashCache.invalidateCrm();
    dashCache.invalidateAdmin();
    res.status(201).json(lead);
  } catch (err) {
    sendError(res, err);
  }
});

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

// GET /leads/first-paid - List all customers who have paid first amount (earliest first-paid person at top)
router.get('/first-paid', protect, async (req, res) => {
  try {
    const baseFilter = buildLeadFilter(req);
    const matchQuery = {
      ...baseFilter,
      'payments.0': { $exists: true },
    };

    if (req.query.stage) {
      matchQuery.stage = req.query.stage;
    }
    if (req.query.method) {
      matchQuery['payments.method'] = req.query.method;
    }

    const search = (req.query.search || '').trim();
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      matchQuery.$or = [
        { name: regex },
        { phone: regex },
        { city: regex },
        { email: regex },
      ];
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: matchQuery },
      {
        $addFields: {
          firstPaymentDate: { $min: '$payments.date' },
          totalPaidAmount: { $sum: '$payments.amount' },
        },
      },
      { $sort: { firstPaymentDate: 1, createdAt: 1 } },
      {
        $facet: {
          paginatedResults: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
          overallStats: [
            {
              $group: {
                _id: null,
                totalPlantCost: { $sum: { $ifNull: ['$plantCost', 0] } },
                totalPaid: { $sum: '$totalPaidAmount' },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ];

    const [aggResult] = await Lead.aggregate(pipeline);
    const rawLeads = aggResult?.paginatedResults || [];
    const total = aggResult?.totalCount?.[0]?.count || 0;
    const stats = aggResult?.overallStats?.[0] || { totalPlantCost: 0, totalPaid: 0, count: 0 };

    const leadIds = rawLeads.map((l) => l._id);
    const populatedLeads = await Lead.find({ _id: { $in: leadIds } })
      .populate(LEAD_DETAIL_FIELDS);

    const leadMap = new Map(populatedLeads.map((l) => [String(l._id), l]));
    const leads = leadIds.map((id) => leadMap.get(String(id))).filter(Boolean);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    res.json({
      leads,
      stats: {
        totalCustomers: stats.count || total,
        totalPlantCost: stats.totalPlantCost || 0,
        totalPaid: stats.totalPaid || 0,
        totalBalanceLeft: Math.max(0, (stats.totalPlantCost || 0) - (stats.totalPaid || 0)),
      },
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

// GET /leads/pending-balance - List all customers whose amount is left (Total Plant Cost - First Paid / Total Paid > 0)
router.get('/pending-balance', protect, async (req, res) => {
  try {
    const baseFilter = buildLeadFilter(req);
    const matchQuery = {
      ...baseFilter,
      plantCost: { $gt: 0 },
    };

    if (req.query.stage) {
      matchQuery.stage = req.query.stage;
    }

    const search = (req.query.search || '').trim();
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      matchQuery.$or = [
        { name: regex },
        { phone: regex },
        { city: regex },
        { email: regex },
      ];
    }

    const filterType = req.query.type || 'all'; // 'all' | 'first-paid' | 'unpaid'
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: matchQuery },
      {
        $addFields: {
          firstPaymentDate: { $min: '$payments.date' },
          totalPaidAmount: { $sum: '$payments.amount' },
          firstPaymentAmount: {
            $ifNull: [{ $arrayElemAt: ['$payments.amount', 0] }, 0],
          },
        },
      },
      {
        $addFields: {
          remainingBalance: {
            $max: [0, { $subtract: [{ $ifNull: ['$plantCost', 0] }, '$totalPaidAmount'] }],
          },
          balanceAfterFirstPayment: {
            $max: [0, { $subtract: [{ $ifNull: ['$plantCost', 0] }, '$firstPaymentAmount'] }],
          },
        },
      },
      {
        $match: filterType === 'first-paid'
          ? { 'payments.0': { $exists: true }, remainingBalance: { $gt: 0 } }
          : filterType === 'unpaid'
          ? { 'payments.0': { $exists: false } }
          : {
              $or: [
                { remainingBalance: { $gt: 0 } },
                { balanceAfterFirstPayment: { $gt: 0 } },
              ],
            },
      },
      { $sort: { remainingBalance: -1, createdAt: -1 } },
      {
        $facet: {
          paginatedResults: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
          overallStats: [
            {
              $group: {
                _id: null,
                totalPlantCost: { $sum: { $ifNull: ['$plantCost', 0] } },
                totalPaid: { $sum: '$totalPaidAmount' },
                totalPendingBalance: { $sum: '$remainingBalance' },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ];

    const [aggResult] = await Lead.aggregate(pipeline);
    const rawLeads = aggResult?.paginatedResults || [];
    const total = aggResult?.totalCount?.[0]?.count || 0;
    const stats = aggResult?.overallStats?.[0] || {
      totalPlantCost: 0, totalPaid: 0, totalPendingBalance: 0, count: 0,
    };

    const leadIds = rawLeads.map((l) => l._id);
    const populatedLeads = await Lead.find({ _id: { $in: leadIds } })
      .populate(LEAD_DETAIL_FIELDS);

    const leadMap = new Map(populatedLeads.map((l) => [String(l._id), l]));
    const leads = leadIds.map((id) => leadMap.get(String(id))).filter(Boolean);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    res.json({
      leads,
      stats: {
        totalPendingCustomers: stats.count || total,
        totalPlantCost: stats.totalPlantCost || 0,
        totalCollected: stats.totalPaid || 0,
        totalPendingBalance: stats.totalPendingBalance || 0,
      },
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

router.post('/', protect, upload.fields(docFields), async (req, res) => {
  try {
    const {
      name, phone, email, panNumber, aadhaarNumber, address, city,
      requirements, systemSize, source, assignedTo, plantCost,
    } = req.body;
    
    if (!name || !name.trim() || !phone || !phone.trim()) {
      return res.status(400).json({ message: 'Name and phone number are required' });
    }

    const finalAssignedTo = (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo))
      ? assignedTo
      : req.user._id;

    const lead = new Lead({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      panNumber: panNumber ? panNumber.trim() : undefined,
      aadhaarNumber: aadhaarNumber ? aadhaarNumber.trim() : undefined,
      address: address ? address.trim() : undefined,
      city: city ? city.trim() : undefined,
      requirements: requirements ? requirements.trim() : undefined,
      systemSize: systemSize ? systemSize.trim() : undefined,
      source: source || 'Manual',
      plantCost: Math.max(0, Number(plantCost) || 0),
      assignedTo: finalAssignedTo,
      createdBy: req.user._id,
      stageHistory: [{
        stage: 'Lead',
        assignedTo: finalAssignedTo,
        movedBy: req.user._id,
        note: 'Lead created',
        date: new Date(),
      }],
    });

    if (req.files && Object.keys(req.files).length > 0) {
      lead.documents = await processDocUploads(req.files, lead._id);
    }

    await lead.save();
    await lead.populate(LEAD_LIST_FIELDS);
    dashCache.invalidateCrm();
    dashCache.invalidateAdmin();
    res.status(201).json(lead);
  } catch (err) {
    sendError(res, err);
  }
});

// POST /leads/:id/payments - Record a payment
router.post('/:id/payments', protect, async (req, res) => {
  try {
    const { amount, method, date, note } = req.body;
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'A valid payment amount greater than 0 is required' });
    }

    const payMethod = method === 'account' ? 'account' : 'cash';
    const payDate = date ? new Date(date) : new Date();

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.payments.push({
      amount: numAmount,
      method: payMethod,
      date: payDate,
      note: (note || '').trim(),
      recordedBy: req.user._id,
    });

    await lead.save();
    await lead.populate(LEAD_DETAIL_FIELDS);
    dashCache.invalidateCrm();
    dashCache.invalidateAdmin();
    res.status(201).json(lead);
  } catch (err) {
    sendError(res, err);
  }
});

// DELETE /leads/:id/payments/:paymentId - Delete a recorded payment
router.delete('/:id/payments/:paymentId', protect, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const payment = lead.payments.id(req.params.paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment record not found' });

    if (req.user.role !== 'admin' && String(payment.recordedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to delete this payment record' });
    }

    payment.deleteOne();
    await lead.save();
    await lead.populate(LEAD_DETAIL_FIELDS);
    dashCache.invalidateCrm();
    dashCache.invalidateAdmin();
    res.json(lead);
  } catch (err) {
    sendError(res, err);
  }
});

// PUT /leads/:id/plant-cost - Update plant cost directly
router.put('/:id/plant-cost', protect, async (req, res) => {
  try {
    const { plantCost } = req.body;
    const cost = Math.max(0, Number(plantCost) || 0);

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { plantCost: cost },
      { new: true }
    ).populate(LEAD_DETAIL_FIELDS);

    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    dashCache.invalidateCrm();
    dashCache.invalidateAdmin();
    res.json(lead);
  } catch (err) {
    sendError(res, err);
  }
});

router.put('/:id/documents', protect, upload.fields(docFields), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const newDocs = await processDocUploads(req.files, lead._id);
    lead.documents = {
      ...(lead.documents ? lead.documents.toObject() : {}),
      ...newDocs,
    };

    await lead.save();
    await lead.populate(LEAD_DETAIL_FIELDS);
    res.json(lead);
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

    if (isStageChange && ['Filing', 'Loan Process', 'Commission'].includes(stage)) {
      sendLeadStageNotification(lead, stage)
        .then((result) => console.log(`📧 Stage email notification (${stage}) result for ${lead.email}:`, result))
        .catch((err) => console.error(`❌ Stage notification email failed (${stage}):`, err));
    }

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

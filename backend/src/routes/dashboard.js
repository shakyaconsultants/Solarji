const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const User = require('../models/User');
const StockItem = require('../models/StockItem');
const StockVoucher = require('../models/StockVoucher');
const QuotationTemplate = require('../models/QuotationTemplate');
const { protect, adminOnly, stockAccess, canViewAllLeads, isAdmin } = require('../middleware/auth');
const { sendError } = require('../utils/sendError');
const dashCache = require('../utils/dashboardCache');

const LEAD_LIST_FIELDS = [
  { path: 'assignedTo', select: 'name email points' },
  { path: 'createdBy', select: 'name email' },
];

function buildLeadFilter(user) {
  const filter = {};
  if (!canViewAllLeads(user)) filter.assignedTo = user._id;
  return filter;
}

function parseLeadStatsAgg(aggRows, stages) {
  const facet = aggRows[0] || { summary: [], stageCounts: [] };
  const summary = facet.summary[0] || {
    total: 0, commissioned: 0, inProgress: 0, newToday: 0,
  };
  const stageCounts = Object.fromEntries(stages.map((s) => [s, 0]));
  facet.stageCounts.forEach(({ _id, count }) => {
    if (_id && stageCounts[_id] !== undefined) stageCounts[_id] = count;
  });
  return {
    total: summary.total,
    stageCounts,
    commissioned: summary.commissioned,
    inProgress: summary.inProgress,
    newToday: summary.newToday,
  };
}

async function fetchLeadStats(filter) {
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

  return parseLeadStatsAgg(aggRows, Lead.STAGES);
}

router.get('/crm', protect, async (req, res) => {
  try {
    const key = dashCache.crmKey(req.user._id);
    const cached = dashCache.getCached(key);
    if (cached) return res.json(cached);

    const filter = buildLeadFilter(req.user);

    const [stats, recent, leaderboard] = await Promise.all([
      fetchLeadStats(filter),
      Lead.find(filter)
        .populate(LEAD_LIST_FIELDS)
        .sort({ updatedAt: -1 })
        .limit(8)
        .lean(),
      User.find({ isActive: true })
        .select('name email role points')
        .sort({ points: -1 })
        .lean(),
    ]);

    const payload = { stats, recent, leaderboard };
    dashCache.setCached(key, payload);
    res.json(payload);
  } catch (err) {
    sendError(res, err, 'Could not load dashboard.');
  }
});

router.get('/admin', protect, adminOnly, async (req, res) => {
  try {
    const key = dashCache.adminKey();
    const cached = dashCache.getCached(key);
    if (cached) return res.json(cached);

    const [users, leads, items, vouchers, templates] = await Promise.all([
      User.countDocuments(),
      Lead.countDocuments(),
      StockItem.countDocuments({ isActive: true }),
      StockVoucher.countDocuments(),
      QuotationTemplate.find({ isActive: true }).sort({ updatedAt: -1 }).lean(),
    ]);

    const payload = {
      counts: { users, leads, items, vouchers },
      templates,
    };
    dashCache.setCached(key, payload);
    res.json(payload);
  } catch (err) {
    sendError(res, err, 'Could not load dashboard.');
  }
});

router.get('/stock', protect, stockAccess, async (req, res) => {
  try {
    const isAdminUser = isAdmin(req.user);
    const key = dashCache.stockKey(isAdminUser);
    const cached = dashCache.getCached(key);
    if (cached) return res.json(cached);

    const voucherFilter = isAdminUser ? {} : { type: 'SELL' };

    const [summaryAgg, lowStock, previewItems, recentVouchers, totalVouchers] = await Promise.all([
      StockItem.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$quantity', '$purchasePrice'] } },
          },
        },
      ]),
      StockItem.find({
        isActive: true,
        minQuantity: { $gt: 0 },
        $expr: { $lte: ['$quantity', '$minQuantity'] },
      })
        .select('name quantity unit minQuantity')
        .sort({ quantity: 1 })
        .limit(20)
        .lean(),
      StockItem.find({ isActive: true })
        .select('name category quantity unit sellPrice minQuantity')
        .sort({ name: 1 })
        .limit(8)
        .lean(),
      StockVoucher.find(voucherFilter)
        .select('voucherNumber party type totalAmount createdAt')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      StockVoucher.countDocuments(voucherFilter),
    ]);

    const summary = summaryAgg[0] || { totalItems: 0, totalValue: 0 };

    const payload = {
      stats: {
        totalItems: summary.totalItems,
        totalValue: isAdminUser ? summary.totalValue : 0,
        lowStockCount: lowStock.length,
        totalVouchers,
      },
      lowStock,
      previewItems,
      recentVouchers,
    };
    dashCache.setCached(key, payload);
    res.json(payload);
  } catch (err) {
    sendError(res, err, 'Could not load dashboard.');
  }
});

module.exports = router;

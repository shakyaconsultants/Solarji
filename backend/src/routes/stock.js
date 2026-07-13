const express = require('express');
const router = express.Router();
const StockItem = require('../models/StockItem');
const StockVoucher = require('../models/StockVoucher');
const {
  protect, stockAccess, stockItemManage, stockTransact, isAdmin,
} = require('../middleware/auth');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { sendError } = require('../utils/sendError');
const dashCache = require('../utils/dashboardCache');

// Public route - get active stock items list for Quotation page
router.get('/public/items', async (req, res) => {
  try {
    const items = await StockItem.find({ isActive: true })
      .select('name category unit sellPrice')
      .sort({ name: 1 })
      .lean();
    res.json({ items });
  } catch (err) {
    sendError(res, err, 'Could not load public stock items.');
  }
});

router.use(protect);

async function loadStockItemMap(itemIds) {
  const uniqueIds = [...new Set(itemIds.map(String))];
  if (!uniqueIds.length) return new Map();
  const stockItems = await StockItem.find({ _id: { $in: uniqueIds }, isActive: true });
  return new Map(stockItems.map((item) => [String(item._id), item]));
}

function applyVoucherRowChange(changes, stockItem, type, row) {
  const id = String(stockItem._id);
  if (!changes.has(id)) {
    changes.set(id, {
      item: stockItem,
      quantityDelta: 0,
      purchasePrice: undefined,
      sellPrice: undefined,
    });
  }

  const change = changes.get(id);
  const price = type === 'ADD'
    ? (row.price ?? stockItem.purchasePrice)
    : (row.price ?? stockItem.sellPrice);

  change.quantityDelta += type === 'ADD' ? row.quantity : -row.quantity;
  if (row.price && type === 'ADD') change.purchasePrice = row.price;
  if (row.price && type === 'SELL') change.sellPrice = row.price;

  return { price, total: price * row.quantity };
}

function buildStockBulkOps(changes) {
  return [...changes.entries()].map(([id, change]) => {
    const update = { $inc: { quantity: change.quantityDelta } };
    const $set = {};
    if (change.purchasePrice !== undefined) $set.purchasePrice = change.purchasePrice;
    if (change.sellPrice !== undefined) $set.sellPrice = change.sellPrice;
    if (Object.keys($set).length) update.$set = $set;
    return { updateOne: { filter: { _id: id }, update } };
  });
}

// Stock Items
router.get('/items', stockAccess, async (req, res) => {
  try {
    const isAdminUser = isAdmin(req.user);
    if (req.query.picker === '1') {
      const search = (req.query.search || '').trim();
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 100));
      const filter = { isActive: true };
      if (search) filter.name = { $regex: search, $options: 'i' };
      const selectFields = isAdminUser
        ? 'name quantity unit purchasePrice sellPrice'
        : 'name quantity unit sellPrice';
      const items = await StockItem.find(filter)
        .select(selectFields)
        .sort({ name: 1 })
        .limit(limit)
        .lean();
      return res.json({ items });
    }

    const { page, limit, skip } = parsePagination(req.query, 20, 100);
    const filter = { isActive: true };
    const search = (req.query.search || '').trim();
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const query = StockItem.find(filter).sort({ name: 1 }).skip(skip).limit(limit);
    if (!isAdminUser) {
      query.select('-purchasePrice');
    }

    const [items, total] = await Promise.all([
      query,
      StockItem.countDocuments(filter),
    ]);

    res.json({ items, pagination: paginationMeta(page, limit, total) });
  } catch (err) {
    sendError(res, err, 'Could not load stock items.');
  }
});

function duplicateItemMessage(name) {
  return `"${name}" already exists. Edit that item or use Stock Voucher to add quantity.`;
}

router.post('/items', stockItemManage, async (req, res) => {
  try {
    const body = { ...req.body, name: req.body.name?.trim() };
    if (!body.name) return res.status(400).json({ message: 'Item name required' });

    const existing = await StockItem.findOne({ name: body.name });
    if (existing) {
      if (existing.isActive) {
        return res.status(409).json({ message: duplicateItemMessage(existing.name) });
      }
      Object.assign(existing, body, { isActive: true });
      await existing.save();
      dashCache.invalidateStock();
      dashCache.invalidateAdmin();
      return res.json(existing);
    }

    const item = await StockItem.create(body);
    dashCache.invalidateStock();
    dashCache.invalidateAdmin();
    res.status(201).json(item);
  } catch (err) {
    sendError(res, err, 'Could not save stock item.');
  }
});

router.put('/items/:id', stockItemManage, async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.name) body.name = body.name.trim();

    if (body.name) {
      const duplicate = await StockItem.findOne({
        name: body.name,
        _id: { $ne: req.params.id },
        isActive: true,
      });
      if (duplicate) {
        return res.status(409).json({ message: duplicateItemMessage(duplicate.name) });
      }
    }

    const item = await StockItem.findByIdAndUpdate(req.params.id, body, { new: true });
    dashCache.invalidateStock();
    res.json(item);
  } catch (err) {
    sendError(res, err, 'Could not update stock item.');
  }
});

router.delete('/items/:id', stockItemManage, async (req, res) => {
  try {
    await StockItem.findByIdAndUpdate(req.params.id, { isActive: false });
    dashCache.invalidateStock();
    dashCache.invalidateAdmin();
    res.json({ message: 'Item deactivated' });
  } catch (err) {
    sendError(res, err, 'Could not deactivate stock item.');
  }
});

// Vouchers
router.get('/vouchers', stockAccess, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.type) filter.type = req.query.type;

    const isAdminUser = isAdmin(req.user);
    if (!isAdminUser) {
      filter.type = 'SELL';
    }

    const [vouchers, total, summaryAgg] = await Promise.all([
      StockVoucher.find(filter)
        .populate('createdBy', 'name')
        .populate('items.item', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      StockVoucher.countDocuments(filter),
      StockVoucher.aggregate([
        ...(Object.keys(filter).length ? [{ $match: filter }] : []),
        { $group: { _id: '$type', total: { $sum: '$totalAmount' } } },
      ]),
    ]);

    const summary = { purchase: 0, sales: 0 };
    summaryAgg.forEach((row) => {
      if (row._id === 'ADD') summary.purchase = row.total;
      if (row._id === 'SELL') summary.sales = row.total;
    });

    res.json({ vouchers, pagination: paginationMeta(page, limit, total), summary });
  } catch (err) {
    sendError(res, err, 'Could not load vouchers.');
  }
});

router.get('/vouchers/:id', stockAccess, async (req, res) => {
  try {
    const voucher = await StockVoucher.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('items.item');
    if (!voucher) return res.status(404).json({ message: 'Voucher not found' });

    if (voucher.type === 'ADD' && !isAdmin(req.user)) {
      return res.status(403).json({ message: 'Only admins can access Purchase Vouchers' });
    }

    res.json(voucher);
  } catch (err) {
    sendError(res, err, 'Could not load voucher details.');
  }
});

router.delete('/vouchers/:id', stockTransact, async (req, res) => {
  try {
    const voucher = await StockVoucher.findById(req.params.id).populate('items.item');
    if (!voucher) return res.status(404).json({ message: 'Voucher not found' });

    if (voucher.type === 'ADD' && !isAdmin(req.user)) {
      return res.status(403).json({ message: 'Only admins can delete Purchase Vouchers' });
    }

    const reverseType = voucher.type === 'ADD' ? 'SELL' : 'ADD';
    const changes = new Map();

    for (const row of voucher.items) {
      const stockItem = row.item;
      if (!stockItem?._id) continue;
      applyVoucherRowChange(changes, stockItem, reverseType, row);
    }

    const bulkOps = buildStockBulkOps(changes);
    if (bulkOps.length) await StockItem.bulkWrite(bulkOps);

    await StockVoucher.findByIdAndDelete(req.params.id);
    dashCache.invalidateStock();
    dashCache.invalidateAdmin();
    res.json({ message: 'Voucher deleted and stock reversed' });
  } catch (err) {
    sendError(res, err, 'Could not delete voucher.');
  }
});

router.post('/vouchers', stockTransact, async (req, res) => {
  try {
    const { type, items, party, partyAddress, note, date } = req.body;
    if (type === 'ADD' && !isAdmin(req.user)) {
      return res.status(403).json({ message: 'Only admins can create Purchase Vouchers' });
    }
    if (!items?.length) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    const itemMap = await loadStockItemMap(items.map((row) => row.item));
    const changes = new Map();
    let totalAmount = 0;
    const processedItems = [];

    for (const row of items) {
      const stockItem = itemMap.get(String(row.item));
      if (!stockItem) {
        return res.status(400).json({ message: `Item not found: ${row.item}` });
      }

      const { price, total } = applyVoucherRowChange(changes, stockItem, type, row);
      totalAmount += total;

      processedItems.push({
        item: stockItem._id,
        itemName: stockItem.name,
        unit: stockItem.unit || 'piece',
        quantity: row.quantity,
        price,
        total,
      });
    }

    for (const change of changes.values()) {
      const newQuantity = change.item.quantity + change.quantityDelta;
      if (newQuantity < 0) {
        return res.status(400).json({ message: `Insufficient stock for ${change.item.name}` });
      }
    }

    const bulkOps = buildStockBulkOps(changes);
    if (bulkOps.length) await StockItem.bulkWrite(bulkOps);

    const voucher = await StockVoucher.create({
      type,
      items: processedItems,
      totalAmount,
      party,
      partyAddress,
      note,
      date: date ? new Date(date) : new Date(),
      createdBy: req.user._id,
    });

    await voucher.populate('createdBy', 'name');
    dashCache.invalidateStock();
    dashCache.invalidateAdmin();
    res.status(201).json(voucher);
  } catch (err) {
    sendError(res, err, 'Could not create voucher.');
  }
});

module.exports = router;

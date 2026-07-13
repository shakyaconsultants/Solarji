const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { paginationMeta } = require('../utils/pagination');
const { sendError } = require('../utils/sendError');

// Helper to check if user has manager privileges
const canManageAllOrders = (user) => user.role === 'admin' || user.role === 'manager' || user.role === 'stock_manager';

// Public — create order from e-commerce store
router.post('/public', async (req, res) => {
  try {
    const { customerName, phone, address, city, notes, items, totalAmount } = req.body;
    if (!customerName || !phone || !address || !city || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Missing required customer or items details' });
    }

    // Generate unique order number (e.g., ORD-2026-100244)
    const datePrefix = `ORD-${new Date().getFullYear()}`;
    const randomSuffix = Math.floor(100000 + Math.random() * 900000); 
    const orderNumber = `${datePrefix}-${randomSuffix}`;

    // Find first active admin to assign the order
    const admin = await User.findOne({ role: 'admin', isActive: true });
    
    const order = await Order.create({
      orderNumber,
      customerName,
      phone,
      address,
      city,
      notes,
      items,
      totalAmount,
      assignedTo: admin ? admin._id : undefined
    });

    res.status(201).json(order);
  } catch (err) {
    sendError(res, err, 'Could not create order inquiry.');
  }
});

// Protect all routes below
router.use(protect);

// GET /api/orders — list orders
router.get('/', async (req, res) => {
  try {
    const filter = {};
    
    // Authorization filter
    if (!canManageAllOrders(req.user)) {
      filter.assignedTo = req.user._id;
    }

    // Status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Search filter
    const search = (req.query.search || '').trim();
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders,
      pagination: paginationMeta(page, limit, total),
    });
  } catch (err) {
    sendError(res, err, 'Could not load orders.');
  }
});

// GET /api/orders/:id — single order details
router.get('/:id', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (!canManageAllOrders(req.user)) {
      filter.assignedTo = req.user._id;
    }

    const order = await Order.findOne(filter).populate('assignedTo', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    sendError(res, err);
  }
});

// PUT /api/orders/:id — update order status/assignee
router.put('/:id', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (!canManageAllOrders(req.user)) {
      filter.assignedTo = req.user._id;
    }

    const order = await Order.findOne(filter);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const { status, assignedTo } = req.body;
    if (status) order.status = status;
    if (assignedTo && canManageAllOrders(req.user)) order.assignedTo = assignedTo;

    await order.save();
    
    const updated = await Order.findById(order._id).populate('assignedTo', 'name email');
    res.json(updated);
  } catch (err) {
    sendError(res, err);
  }
});

// DELETE /api/orders/:id — delete order (admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admin only' });
    }
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;

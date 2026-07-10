const express = require('express');
const router = express.Router();
const QuotationTemplate = require('../models/QuotationTemplate');
const { protect, adminOnly } = require('../middleware/auth');

const { sendError } = require('../utils/sendError');

router.get('/templates', protect, async (req, res) => {
  try {
    const templates = await QuotationTemplate.find({ isActive: true }).populate('createdBy', 'name');
    res.json(templates);
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/templates', protect, adminOnly, async (req, res) => {
  try {
    const template = await QuotationTemplate.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(template);
  } catch (err) {
    sendError(res, err);
  }
});

router.put('/templates/:id', protect, adminOnly, async (req, res) => {
  try {
    const template = await QuotationTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(template);
  } catch (err) {
    sendError(res, err);
  }
});

router.delete('/templates/:id', protect, adminOnly, async (req, res) => {
  try {
    await QuotationTemplate.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Template deleted' });
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;

const mongoose = require('mongoose');

const calculationRowSchema = new mongoose.Schema({
  label: { type: String, required: true },
  type: { type: String, enum: ['input', 'calculated', 'fixed'], default: 'input' },
  formula: { type: String },
  defaultValue: { type: Number },
  unit: { type: String },
  order: { type: Number, default: 0 },
});

const quotationTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  rows: [calculationRowSchema],
  footer: { type: String },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

quotationTemplateSchema.index({ isActive: 1, updatedAt: -1 });
quotationTemplateSchema.index({ createdBy: 1 });

module.exports = mongoose.model('QuotationTemplate', quotationTemplateSchema);

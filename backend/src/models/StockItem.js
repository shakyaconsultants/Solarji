const mongoose = require('mongoose');

const stockItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  description: { type: String },
  category: { type: String, default: 'General' },
  unit: { type: String, default: 'piece' },
  purchasePrice: { type: Number, default: 0 },
  sellPrice: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  minQuantity: { type: Number, default: 0 },
  imageUrl: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

stockItemSchema.index({ isActive: 1, name: 1 });
stockItemSchema.index({ isActive: 1, category: 1 });
stockItemSchema.index({ isActive: 1, minQuantity: 1, quantity: 1 });

module.exports = mongoose.model('StockItem', stockItemSchema);

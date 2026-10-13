const mongoose = require('mongoose');

const loadGroupItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'StockItem', required: false },
  itemName: { type: String, required: true, trim: true },
  category: { type: String, default: 'General', trim: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'piece', trim: true },
  price: { type: Number, default: 0 },
  notes: { type: String, default: '', trim: true },
});

const loadItemGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  load: { type: String, required: true, trim: true }, // e.g. "3 kW", "3 kWh", "5 kW"
  loadCapacity: { type: Number, default: 0 }, // numeric value e.g. 3, 5, 10 for sorting
  systemType: { type: String, default: 'On-Grid', trim: true }, // 'On-Grid', 'Off-Grid', 'Hybrid', 'Commercial'
  description: { type: String, default: '', trim: true },
  items: [loadGroupItemSchema],
  totalEstimatedCost: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

loadItemGroupSchema.index({ isActive: 1, loadCapacity: 1, name: 1 });
loadItemGroupSchema.index({ isActive: 1, load: 1 });

module.exports = mongoose.model('LoadItemGroup', loadItemGroupSchema);

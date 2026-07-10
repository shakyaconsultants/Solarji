const mongoose = require('mongoose');

const voucherItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'StockItem', required: true },
  itemName: { type: String, required: true },
  unit: { type: String, default: 'piece' },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  total: { type: Number, required: true },
});

const stockVoucherSchema = new mongoose.Schema({
  voucherNumber: { type: String, unique: true },
  type: { type: String, enum: ['ADD', 'SELL'], required: true },
  date: { type: Date, default: Date.now },        // user-selectable transaction date
  items: [voucherItemSchema],
  totalAmount: { type: Number, required: true },
  party: { type: String, trim: true },
  partyAddress: { type: String, trim: true },
  note: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

stockVoucherSchema.pre('save', async function () {
  if (!this.voucherNumber) {
    const prefix = this.type === 'ADD' ? 'PV' : 'SV';
    const latest = await this.constructor
      .findOne({ type: this.type })
      .sort({ createdAt: -1 })
      .select('voucherNumber')
      .lean();
    const lastNum = latest?.voucherNumber
      ? parseInt(latest.voucherNumber.split('-')[1], 10) || 0
      : 0;
    this.voucherNumber = `${prefix}-${String(lastNum + 1).padStart(5, '0')}`;
  }
});

stockVoucherSchema.index({ type: 1, createdAt: -1 });
stockVoucherSchema.index({ createdAt: -1 });
stockVoucherSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('StockVoucher', stockVoucherSchema);

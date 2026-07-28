const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hsn: { type: String, default: '' },
  qty: { type: Number, required: true, default: 1 },
  unit: { type: String, default: 'Nos' },
  price: { type: Number, required: true, default: 0 },
  gst: { type: Number, required: true, default: 18 }
});

const quotationSchema = new mongoose.Schema({
  estimateNo: { type: String, required: true },
  date: { type: String, required: true },
  customerName: { type: String, required: true, trim: true },
  customerPhone: { type: String, trim: true, default: '' },
  customerAddress: { type: String, trim: true, default: '' },
  category: { type: String, enum: ['rooftop', 'pump', 'chakki'], default: 'rooftop' },
  items: [quotationItemSchema],
  subTotal: { type: Number, required: true, default: 0 },
  totalGst: { type: Number, required: true, default: 0 },
  grandTotal: { type: Number, required: true, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

quotationSchema.index({ createdAt: -1 });
quotationSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Quotation', quotationSchema);

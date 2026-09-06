const mongoose = require('mongoose');

const STAGES = [
  'Lead', 'Calling', 'Visit', 'Filing',
  'Loan Filing', 'Loan Process', 'Loan Release', 'Installation',
  'Kesco Filing', 'Kesco Process', 'Meter Install', 'Subsidy Apply', 'Subsidy Release', 'Commission'
];

const stageHistorySchema = new mongoose.Schema({
  stage: { type: String, enum: STAGES },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  movedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note: { type: String },
  date: { type: Date, default: Date.now },
});

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  method: { type: String, enum: ['cash', 'account'], default: 'cash', required: true },
  date: { type: Date, default: Date.now, required: true },
  note: { type: String, trim: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  panNumber: { type: String, trim: true },
  aadhaarNumber: { type: String, trim: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  requirements: { type: String },
  systemSize: { type: String },
  source: { type: String, default: 'Manual' },
  plantCost: { type: Number, default: 0, min: 0 },
  payments: [paymentSchema],

  stage: { type: String, enum: STAGES, default: 'Lead' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  stageHistory: [stageHistorySchema],
  notes: [{
    text: { type: String },
    images: [{
      url: { type: String, required: true },
      publicId: { type: String },
      width: { type: Number },
      height: { type: Number },
      bytes: { type: Number },
    }],
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
  }],
  documents: {
    aadhaar: { url: String, publicId: String, originalName: String },
    pan: { url: String, publicId: String, originalName: String },
    passbook: { url: String, publicId: String, originalName: String },
    houseTax: { url: String, publicId: String, originalName: String },
    electricityBill: { url: String, publicId: String, originalName: String },
    rooftopPhoto: { url: String, publicId: String, originalName: String },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual: Total amount paid across all payments
leadSchema.virtual('totalPaid').get(function () {
  if (!this.payments || !this.payments.length) return 0;
  return this.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
});

// Virtual: First payment record (sorted by date ascending)
leadSchema.virtual('firstPayment').get(function () {
  if (!this.payments || !this.payments.length) return null;
  const sorted = [...this.payments].sort((a, b) => new Date(a.date) - new Date(b.date));
  return sorted[0];
});

// Virtual: Amount paid in the first payment
leadSchema.virtual('firstPaymentAmount').get(function () {
  const fp = this.firstPayment;
  return fp ? (Number(fp.amount) || 0) : 0;
});

// Virtual: Date of the first payment
leadSchema.virtual('firstPaymentDate').get(function () {
  const fp = this.firstPayment;
  return fp ? fp.date : null;
});

// Virtual: Method of the first payment
leadSchema.virtual('firstPaymentMethod').get(function () {
  const fp = this.firstPayment;
  return fp ? fp.method : null;
});

// Virtual: Total amount - first paid amount (amount left after first payment)
leadSchema.virtual('balanceAfterFirstPayment').get(function () {
  const cost = Number(this.plantCost) || 0;
  const firstPaid = this.firstPaymentAmount || 0;
  return Math.max(0, cost - firstPaid);
});

// Virtual: Total amount - total paid amount (overall remaining balance)
leadSchema.virtual('remainingBalance').get(function () {
  const cost = Number(this.plantCost) || 0;
  const paid = this.totalPaid || 0;
  return Math.max(0, cost - paid);
});

leadSchema.statics.STAGES = STAGES;

leadSchema.index({ name: 'text', phone: 'text', city: 'text', email: 'text' });
leadSchema.index({ assignedTo: 1, updatedAt: -1 });
leadSchema.index({ stage: 1, updatedAt: -1 });
leadSchema.index({ plantCost: 1 });
leadSchema.index({ 'payments.date': 1 });
leadSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);

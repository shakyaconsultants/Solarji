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
}, { timestamps: true });

leadSchema.statics.STAGES = STAGES;

leadSchema.index({ name: 'text', phone: 'text', city: 'text', email: 'text' });
leadSchema.index({ assignedTo: 1, updatedAt: -1 });
leadSchema.index({ stage: 1, updatedAt: -1 });
leadSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);

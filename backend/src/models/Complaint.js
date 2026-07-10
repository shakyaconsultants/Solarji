const mongoose = require('mongoose');
const { COMPLAINT_CATEGORIES } = require('../constants/complaintCategories');

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

const complaintSchema = new mongoose.Schema({
  complaintNumber: { type: String, unique: true },
  category: { type: String, required: true, enum: COMPLAINT_CATEGORIES },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  address: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  status: { type: String, enum: STATUSES, default: 'Open' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  internalNote: { type: String, trim: true, default: '' },
}, { timestamps: true });

complaintSchema.pre('save', async function () {
  if (this.complaintNumber) return;
  const count = await mongoose.model('Complaint').countDocuments();
  this.complaintNumber = `CP-${String(count + 1).padStart(5, '0')}`;
});

complaintSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ email: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
module.exports.COMPLAINT_STATUSES = STATUSES;

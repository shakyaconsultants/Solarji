const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'stock_manager', 'manager', 'user'], default: 'user' },
  phone: { type: String, trim: true },
  empCode: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  handlesComplaints: { type: Boolean, default: false },
  points: { type: Number, default: 0 },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

userSchema.index({ isActive: 1, points: -1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1, handlesComplaints: 1 });

module.exports = mongoose.model('User', userSchema);

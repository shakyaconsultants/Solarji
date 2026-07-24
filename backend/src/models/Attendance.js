const mongoose = require('mongoose');

const punchSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['in', 'out'],
    required: true
  },
  time: {
    type: Date,
    required: true
  }
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // 'YYYY-MM-DD' formatted date in IST
    required: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date
  },
  punches: [punchSchema]
}, { timestamps: true });

// Ensure a user can only have one attendance document per date
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
// Add indices to optimize search and filter queries
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ checkIn: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);

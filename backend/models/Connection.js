const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema(
  {
    investor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startup: { type: mongoose.Schema.Types.ObjectId, ref: 'Startup', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending',
    },
    message: { type: String, default: '', maxlength: 500 },
    investmentRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },
    initiatedBy: {
      type: String,
      enum: ['investor', 'founder'],
      required: true,
      default: 'investor',
    },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

connectionSchema.index({ investor: 1, startup: 1 }, { unique: true });

connectionSchema.pre('save', function (next) {
  if (this.investmentRange) {
    const min = this.investmentRange.min || 0;
    const max = this.investmentRange.max || 0;
    if (min < 0 || max < 0) {
      return next(new Error('Investment range values must be non-negative'));
    }
    if (max > 0 && min > max) {
      return next(new Error('Minimum investment range cannot exceed maximum'));
    }
  }
  next();
});

module.exports = mongoose.model('Connection', connectionSchema);

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
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

connectionSchema.index({ investor: 1, startup: 1 }, { unique: true });

module.exports = mongoose.model('Connection', connectionSchema);

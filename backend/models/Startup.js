const mongoose = require('mongoose');

const startupSchema = new mongoose.Schema(
  {
    founder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: [true, 'Startup name is required'], trim: true },
    tagline: { type: String, required: [true, 'Tagline is required'], maxlength: 120 },
    description: { type: String, required: [true, 'Description is required'], maxlength: 2000 },
    logo: { type: String, default: '' },
    website: { type: String, default: '' },
    category: {
      type: String,
      required: true,
      enum: [
        'FinTech', 'HealthTech', 'EdTech', 'SaaS', 'E-Commerce',
        'AI/ML', 'GreenTech', 'Logistics', 'Social', 'Other',
      ],
    },
    stage: {
      type: String,
      required: true,
      enum: ['Idea', 'MVP', 'Early Traction', 'Growth', 'Scaling'],
    },
    fundingGoal: { type: Number, required: true, min: 0 },
    fundingRaised: { type: Number, default: 0, min: 0 },
    equity: { type: Number, default: 0, min: 0, max: 100 },
    teamSize: { type: Number, default: 1, min: 1 },
    location: { type: String, default: '' },
    pitch: { type: String, default: '' }, // pitch deck URL or short pitch
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },

    // Stats
    views: { type: Number, default: 0 },
    interests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // investors who showed interest
    fundingRounds: [{
      roundName: { type: String, required: true },
      targetAmount: { type: Number, required: true },
      raisedAmount: { type: Number, default: 0 },
      equityOffered: { type: Number, required: true, min: 0, max: 100 },
      status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
      closedAt: { type: Date },
      investments: [{
        investor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now }
      }]
    }]
  },
  { timestamps: true }
);

startupSchema.index({ name: 'text', tagline: 'text', description: 'text' });

module.exports = mongoose.model('Startup', startupSchema);

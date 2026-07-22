const Startup = require('../models/Startup');
const User = require('../models/User');

const calculateMatchScore = require('../utils/matchScore');

// @desc  Create a startup
// @route POST /api/startups
// @access Private (founder only)
const createStartup = async (req, res) => {
  try {
    const startupData = { ...req.body, founder: req.user.id };

    // Auto-bootstrap an initial funding round
    startupData.fundingRounds = [{
      roundName: req.body.stage === 'Idea' ? 'Pre-Seed' : 'Seed',
      targetAmount: Number(req.body.fundingGoal) || 100000,
      raisedAmount: Number(req.body.fundingRaised) || 0,
      equityOffered: Number(req.body.equity) || 0,
      status: 'Open',
    }];

    const startup = await Startup.create(startupData);
    res.status(201).json({ success: true, startup });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc  Get all startups (with filters, search, pagination)
// @route GET /api/startups
// @access Public
const getStartups = async (req, res) => {
  try {
    const { search, category, stage, page = 1, limit = 12 } = req.query;

    const query = { isActive: true };
    if (category) query.category = category;
    if (stage) query.stage = stage;
    if (search) query.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);
    const [startups, total] = await Promise.all([
      Startup.find(query)
        .populate('founder', 'name avatar location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Startup.countDocuments(query),
    ]);

    let requestingUser = null;
    if (req.headers.authorization?.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        requestingUser = await User.findById(decoded.id);
      } catch (err) {}
    }

    const startupsWithScore = startups.map((s) => {
      const sObj = s.toObject();
      if (requestingUser && requestingUser.role === 'investor') {
        sObj.matchScore = calculateMatchScore(sObj, requestingUser);
      }
      return sObj;
    });

    res.json({
      success: true,
      startups: startupsWithScore,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get single startup by ID
// @route GET /api/startups/:id
// @access Public
const getStartup = async (req, res) => {
  try {
    const startup = await Startup.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('founder', 'name avatar bio location linkedin website');

    if (!startup) return res.status(404).json({ success: false, message: 'Startup not found' });

    let requestingUser = null;
    if (req.headers.authorization?.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        requestingUser = await User.findById(decoded.id);
      } catch (err) {}
    }

    const sObj = startup.toObject();
    if (requestingUser && requestingUser.role === 'investor') {
      sObj.matchScore = calculateMatchScore(sObj, requestingUser);
    }

    res.json({ success: true, startup: sObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update startup
// @route PUT /api/startups/:id
// @access Private (founder who owns it)
const updateStartup = async (req, res) => {
  try {
    const startup = await Startup.findById(req.params.id);
    if (!startup) return res.status(404).json({ success: false, message: 'Startup not found' });
    if (startup.founder.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const updated = await Startup.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json({ success: true, startup: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc  Delete startup
// @route DELETE /api/startups/:id
// @access Private (founder who owns it)
const deleteStartup = async (req, res) => {
  try {
    const startup = await Startup.findById(req.params.id);
    if (!startup) return res.status(404).json({ success: false, message: 'Startup not found' });
    if (startup.founder.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const Connection = require('../models/Connection');
    const Message = require('../models/Message');
    const User = require('../models/User');

    await Promise.all([
      startup.deleteOne(),
      Connection.deleteMany({ startup: req.params.id }),
      Message.deleteMany({ relatedStartup: req.params.id }),
      User.updateMany({}, { $pull: { savedStartups: req.params.id } }),
    ]);

    res.json({ success: true, message: 'Startup deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get my startups
// @route GET /api/startups/my
// @access Private
const getMyStartups = async (req, res) => {
  try {
    const startups = await Startup.find({ founder: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, startups });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Save / Unsave a startup
// @route POST /api/startups/:id/save
// @access Private
const toggleSaveStartup = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const startupId = req.params.id;
    const isSaved = user.savedStartups.some((id) => id.toString() === startupId);

    await User.findByIdAndUpdate(
      req.user.id,
      isSaved ? { $pull: { savedStartups: startupId } } : { $addToSet: { savedStartups: startupId } }
    );

    res.json({ success: true, saved: !isSaved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Add a funding round
// @route POST /api/startups/:id/rounds
// @access Private (founder only)
const addFundingRound = async (req, res) => {
  try {
    const { roundName, targetAmount, equityOffered } = req.body;
    const startup = await Startup.findById(req.params.id);
    if (!startup) return res.status(404).json({ success: false, message: 'Startup not found' });
    if (startup.founder.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not authorized' });

    // Close any previous open rounds
    startup.fundingRounds.forEach((r) => {
      if (r.status === 'Open') {
        r.status = 'Closed';
        r.closedAt = new Date();
      }
    });

    startup.fundingRounds.push({
      roundName,
      targetAmount,
      equityOffered,
      status: 'Open',
    });

    // Update main startup target stats
    startup.fundingGoal = targetAmount;
    startup.equity = equityOffered;

    await startup.save();
    res.status(201).json({ success: true, startup });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc  Invest in active funding round
// @route POST /api/startups/:id/invest
// @access Private (connected investor only)
const investInRound = async (req, res) => {
  try {
    if (req.user.role !== 'investor') {
      return res.status(403).json({ success: false, message: 'Only investors are permitted to invest' });
    }

    const { amount } = req.body;
    const investmentAmount = Number(amount);
    if (isNaN(investmentAmount) || investmentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid investment amount' });
    }

    // Check accepted connection
    const Connection = require('../models/Connection');
    const conn = await Connection.findOne({ investor: req.user.id, startup: req.params.id, status: 'accepted' });
    if (!conn) return res.status(403).json({ success: false, message: 'You must have an accepted connection to invest' });

    // Atomically increment values and push new investment to the active open round
    const updatedStartup = await Startup.findOneAndUpdate(
      {
        _id: req.params.id,
        'fundingRounds.status': 'Open',
      },
      {
        $inc: {
          fundingRaised: investmentAmount,
          'fundingRounds.$.raisedAmount': investmentAmount,
        },
        $push: {
          'fundingRounds.$.investments': {
            investor: req.user.id,
            amount: investmentAmount,
            date: new Date(),
          },
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedStartup) {
      return res.status(400).json({ success: false, message: 'No active open funding round found' });
    }

    // Check if the target amount was reached and if we should auto-close this round
    const activeRound = updatedStartup.fundingRounds.find((r) => r.status === 'Open');
    if (activeRound && activeRound.raisedAmount >= activeRound.targetAmount) {
      // Close the round atomically
      const closedStartup = await Startup.findOneAndUpdate(
        {
          _id: req.params.id,
          'fundingRounds._id': activeRound._id,
          'fundingRounds.status': 'Open', // Prevent double-closing / conflicts
        },
        {
          $set: {
            'fundingRounds.$.status': 'Closed',
            'fundingRounds.$.closedAt': new Date(),
          },
        },
        { new: true }
      );
      return res.json({ success: true, startup: closedStartup || updatedStartup });
    }

    res.json({ success: true, startup: updatedStartup });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  createStartup,
  getStartups,
  getStartup,
  updateStartup,
  deleteStartup,
  getMyStartups,
  toggleSaveStartup,
  addFundingRound,
  investInRound,
};

const Startup = require('../models/Startup');
const User = require('../models/User');

const calculateMatchScore = (startup, investor) => {
  if (!investor || investor.role !== 'investor') return null;

  let score = 0;
  const prefs = investor.investorPreferences;

  // 1. Sector/Category Match (40 points)
  if (prefs?.sectors?.length > 0) {
    if (prefs.sectors.includes(startup.category)) {
      score += 40;
    }
  } else {
    const bioText = (investor.bio || '').toLowerCase();
    const catText = startup.category.toLowerCase();
    if (bioText.includes(catText) || (catText === 'ai/ml' && (bioText.includes('artificial') || bioText.includes('machine learning') || bioText.includes('ai') || bioText.includes('ml')))) {
      score += 40;
    } else {
      score += 25;
    }
  }

  // 2. Stage Match (35 points)
  if (prefs?.stages?.length > 0) {
    if (prefs.stages.includes(startup.stage)) {
      score += 35;
    }
  } else {
    score += 20;
  }

  // 3. Location Match (25 points)
  if (prefs?.locations?.length > 0) {
    if (prefs.locations.some(loc => loc.toLowerCase().trim() === startup.location.toLowerCase().trim())) {
      score += 25;
    }
  } else if (investor.location && startup.location) {
    const invLoc = investor.location.toLowerCase().split(',')[0].trim();
    const stLoc = startup.location.toLowerCase().split(',')[0].trim();
    if (invLoc === stLoc && invLoc.length > 0) {
      score += 25;
    } else {
      score += 15;
    }
  } else {
    score += 15;
  }

  return Math.min(Math.max(score, 60), 100);
};

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

    await startup.deleteOne();
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
    const { amount } = req.body;
    const startup = await Startup.findById(req.params.id);
    if (!startup) return res.status(404).json({ success: false, message: 'Startup not found' });

    // Check accepted connection
    const Connection = require('../models/Connection');
    const conn = await Connection.findOne({ investor: req.user.id, startup: req.params.id, status: 'accepted' });
    if (!conn) return res.status(403).json({ success: false, message: 'You must have an accepted connection to invest' });

    // Find active round
    const openRound = startup.fundingRounds.find((r) => r.status === 'Open');
    if (!openRound) return res.status(400).json({ success: false, message: 'No active open funding round found' });

    openRound.investments.push({
      investor: req.user.id,
      amount: Number(amount),
    });
    openRound.raisedAmount += Number(amount);
    startup.fundingRaised += Number(amount);

    if (openRound.raisedAmount >= openRound.targetAmount) {
      openRound.status = 'Closed';
      openRound.closedAt = new Date();
    }

    await startup.save();
    res.json({ success: true, startup });
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

const Startup = require('../models/Startup');
const User = require('../models/User');

// @desc  Create a startup
// @route POST /api/startups
// @access Private (founder only)
const createStartup = async (req, res) => {
  try {
    const startup = await Startup.create({ ...req.body, founder: req.user.id });
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

    res.json({
      success: true,
      startups,
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
    res.json({ success: true, startup });
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
    const isSaved = user.savedStartups.includes(startupId);

    await User.findByIdAndUpdate(
      req.user.id,
      isSaved ? { $pull: { savedStartups: startupId } } : { $addToSet: { savedStartups: startupId } }
    );

    res.json({ success: true, saved: !isSaved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createStartup, getStartups, getStartup, updateStartup, deleteStartup, getMyStartups, toggleSaveStartup };

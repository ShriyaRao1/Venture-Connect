const User = require('../models/User');
const Startup = require('../models/Startup');
const calculateMatchScore = require('../utils/matchScore');

// @desc  Get all investors (with filters, search, pagination, and match score)
// @route GET /api/users/investors
// @access Public
const getInvestors = async (req, res) => {
  try {
    const { search, category, stage, location, investorType, page = 1, limit = 12 } = req.query;

    const query = { role: 'investor' };
    if (category) query['investorPreferences.sectors'] = category;
    if (stage) query['investorPreferences.stages'] = stage;
    if (location) query.location = { $regex: new RegExp(location, 'i') };
    if (search) query.$text = { $search: search };
    if (investorType && investorType !== 'All') query.investorType = investorType;

    const skip = (Number(page) - 1) * Number(limit);
    const [investors, total] = await Promise.all([
      User.find(query)
        .select('name avatar bio location website linkedin investorPreferences investorType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    // Parse token if provided to see if requesting user is a founder
    let requestingUser = null;
    if (req.headers.authorization?.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        requestingUser = await User.findById(decoded.id);
      } catch (err) {}
    }

    let startup = null;
    if (requestingUser && requestingUser.role === 'founder') {
      const { startupId } = req.query;
      if (startupId) {
        startup = await Startup.findOne({ _id: startupId, founder: requestingUser.id });
      }
      if (!startup) {
        startup = await Startup.findOne({ founder: requestingUser.id });
      }
    }

    const investorsWithScore = investors.map((inv) => {
      const invObj = inv.toObject();
      if (startup) {
        invObj.matchScore = calculateMatchScore(startup, invObj);
      }
      return invObj;
    });

    res.json({
      success: true,
      investors: investorsWithScore,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get user public profile
// @route GET /api/users/:id
// @access Public
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update own profile
// @route PUT /api/users/profile
// @access Private
const updateProfile = async (req, res) => {
  try {
    const allowed = ['name', 'bio', 'location', 'website', 'linkedin', 'avatar', 'investorPreferences', 'investorType'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc  Update password
// @route PUT /api/users/password
// @access Private
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    if (!(await user.matchPassword(currentPassword)))
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get saved startups
// @route GET /api/users/saved
// @access Private
const getSavedStartups = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'savedStartups',
      populate: { path: 'founder', select: 'name avatar' },
    });
    res.json({ success: true, startups: user.savedStartups });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Save / Unsave an investor
// @route POST /api/users/:id/save-investor
// @access Private (founder only)
const toggleSaveInvestor = async (req, res) => {
  try {
    if (req.user.role !== 'founder') {
      return res.status(403).json({ success: false, message: 'Only founders can save investors' });
    }
    const investorId = req.params.id;

    const target = await User.findById(investorId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Investor not found' });
    }
    if (target.role !== 'investor') {
      return res.status(400).json({ success: false, message: 'User is not an investor' });
    }

    const user = await User.findById(req.user.id);
    const isSaved = user.savedInvestors ? user.savedInvestors.some((id) => id.toString() === investorId) : false;

    await User.findByIdAndUpdate(
      req.user.id,
      isSaved ? { $pull: { savedInvestors: investorId } } : { $addToSet: { savedInvestors: investorId } }
    );

    res.json({ success: true, saved: !isSaved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get saved investors
// @route GET /api/users/saved-investors
// @access Private (founder only)
const getSavedInvestors = async (req, res) => {
  try {
    if (req.user.role !== 'founder') {
      return res.status(403).json({ success: false, message: 'Only founders can access saved investors' });
    }
    const user = await User.findById(req.user.id).populate('savedInvestors', 'name avatar bio location website linkedin');
    res.json({ success: true, investors: user.savedInvestors || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get investor profile by ID
// @route GET /api/users/investors/:id
// @access Public
const getInvestor = async (req, res) => {
  try {
    const investor = await User.findOne({ _id: req.params.id, role: 'investor' }).select('-password -resetPasswordToken -resetPasswordExpire');
    if (!investor) return res.status(404).json({ success: false, message: 'Investor not found' });

    // Check if caller is a founder to compute match score
    let requestingUser = null;
    if (req.headers.authorization?.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        requestingUser = await User.findById(decoded.id);
      } catch (err) {}
    }

    const invObj = investor.toObject();
    if (requestingUser && requestingUser.role === 'founder') {
      const { startupId } = req.query;
      let startup = null;
      if (startupId) {
        startup = await Startup.findOne({ _id: startupId, founder: requestingUser.id });
      }
      if (!startup) {
        startup = await Startup.findOne({ founder: requestingUser.id });
      }
      if (startup) {
        invObj.matchScore = calculateMatchScore(startup, invObj);
      }
    }

    res.json({ success: true, investor: invObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getInvestors,
  getInvestor,
  getUserProfile,
  updateProfile,
  updatePassword,
  getSavedStartups,
  toggleSaveInvestor,
  getSavedInvestors,
};

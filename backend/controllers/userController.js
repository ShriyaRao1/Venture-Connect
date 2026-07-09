const User = require('../models/User');

// @desc  Get all investors (public listing)
// @route GET /api/users/investors
// @access Public
const getInvestors = async (req, res) => {
  try {
    const investors = await User.find({ role: 'investor' })
      .select('name avatar bio location website linkedin')
      .sort({ createdAt: -1 });
    res.json({ success: true, investors });
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
    const allowed = ['name', 'bio', 'location', 'website', 'linkedin', 'avatar', 'investorPreferences'];
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

module.exports = { getInvestors, getUserProfile, updateProfile, updatePassword, getSavedStartups };

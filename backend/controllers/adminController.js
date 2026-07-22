const User = require('../models/User');
const Startup = require('../models/Startup');
const Connection = require('../models/Connection');
const Message = require('../models/Message');

// @desc  Get platform statistics (real data)
// @route GET /api/admin/stats
// @access Private/Admin
const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalFounders,
      totalInvestors,
      totalStartups,
      totalConnections,
      acceptedConnections,
      totalMessages,
      recentUsers,
      recentStartups,
      startupsByCategory,
      startupsByStage,
      totalFundingGoal,
      totalFundingRaised,
      totalFundingRounds,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'founder' }),
      User.countDocuments({ role: 'investor' }),
      Startup.countDocuments(),
      Connection.countDocuments(),
      Connection.countDocuments({ status: 'accepted' }),
      Message.countDocuments(),
      User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt avatar'),
      Startup.find().sort({ createdAt: -1 }).limit(5).select('name category stage fundingGoal founder createdAt').populate('founder', 'name'),
      Startup.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Startup.aggregate([{ $group: { _id: '$stage', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Startup.aggregate([{ $group: { _id: null, total: { $sum: '$fundingGoal' } } }]),
      Startup.aggregate([{ $group: { _id: null, total: { $sum: '$fundingRaised' } } }]),
      Startup.aggregate([{ $unwind: '$fundingRounds' }, { $count: 'count' }]),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalFounders,
        totalInvestors,
        totalStartups,
        totalConnections,
        acceptedConnections,
        totalMessages,
        totalFundingGoal: totalFundingGoal[0]?.total || 0,
        totalFundingRaised: totalFundingRaised[0]?.total || 0,
        totalFundingRounds: totalFundingRounds[0]?.count || 0,
        startupsByCategory,
        startupsByStage,
        recentUsers,
        recentStartups,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get all users (paginated)
// @route GET /api/admin/users
// @access Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const role  = req.query.role;
    const search = req.query.search;

    const query = {};
    if (role)   query.role = role;
    if (search) query.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-password'),
      User.countDocuments(query),
    ]);

    res.json({ success: true, users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update user role
// @route PUT /api/admin/users/:id/role
// @access Private/Admin
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['founder', 'investor', 'admin'].includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role' });

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete user
// @route DELETE /api/admin/users/:id
// @access Private/Admin
const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });

    // Retrieve user's startups first to perform cascade deletion of startup dependencies
    const startups = await Startup.find({ founder: req.params.id }).select('_id');
    const startupIds = startups.map((s) => s._id);

    await Promise.all([
      User.findByIdAndDelete(req.params.id),
      Startup.deleteMany({ founder: req.params.id }),
      Connection.deleteMany({
        $or: [
          { investor: req.params.id },
          { startup: { $in: startupIds } },
        ],
      }),
      Message.deleteMany({
        $or: [
          { sender: req.params.id },
          { receiver: req.params.id },
          { relatedStartup: { $in: startupIds } },
        ],
      }),
      User.updateMany({}, {
        $pull: {
          savedStartups: { $in: startupIds },
          savedInvestors: req.params.id,
        },
      }),
    ]);

    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get all startups (admin view)
// @route GET /api/admin/startups
// @access Private/Admin
const getAllStartups = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const search = req.query.search;

    const query = {};
    if (search) query.$or = [
      { name:    { $regex: search, $options: 'i' } },
      { tagline: { $regex: search, $options: 'i' } },
    ];

    const [startups, total] = await Promise.all([
      Startup.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('founder', 'name email'),
      Startup.countDocuments(query),
    ]);

    res.json({ success: true, startups, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete startup (admin)
// @route DELETE /api/admin/startups/:id
// @access Private/Admin
const deleteStartup = async (req, res) => {
  try {
    const startup = await Startup.findByIdAndDelete(req.params.id);
    if (!startup) return res.status(404).json({ success: false, message: 'Startup not found' });
    res.json({ success: true, message: 'Startup deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get public platform stats for home page
// @route GET /api/admin/public-stats
// @access Public
const getPublicStats = async (req, res) => {
  try {
    const [totalStartups, totalInvestors, totalConnections, uniqueLocations] = await Promise.all([
      Startup.countDocuments(),
      User.countDocuments({ role: 'investor' }),
      Connection.countDocuments({ status: 'accepted' }),
      Startup.distinct('location'),
    ]);

    // Total funding goal in Cr
    const fundingAgg = await Startup.aggregate([{ $group: { _id: null, total: { $sum: '$fundingGoal' } } }]);
    const totalFundingGoalCr = Math.round((fundingAgg[0]?.total || 0) / 100000) / 100; // paise → Cr

    res.json({
      success: true,
      stats: {
        totalStartups,
        totalInvestors,
        totalConnections,
        citiesCovered: uniqueLocations.filter(Boolean).length,
        totalFundingGoalCr,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getStats, getAllUsers, updateUserRole, deleteUser, getAllStartups, deleteStartup, getPublicStats };

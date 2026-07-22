const Connection = require('../models/Connection');
const Startup = require('../models/Startup');
const User = require('../models/User');

// @desc  Express interest in a startup
// @route POST /api/connections
// @access Private (investor)
const expressInterest = async (req, res) => {
  try {
    if (req.user.role !== 'investor') {
      return res.status(403).json({ success: false, message: 'Only investors can express interest' });
    }
    const { startupId, message, investmentRange } = req.body;

    const startup = await Startup.findById(startupId);
    if (!startup) return res.status(404).json({ success: false, message: 'Startup not found' });
    if (startup.founder.toString() === req.user.id)
      return res.status(400).json({ success: false, message: 'You cannot invest in your own startup' });

    const existing = await Connection.findOne({ investor: req.user.id, startup: startupId });
    if (existing) return res.status(409).json({ success: false, message: 'Already expressed interest' });

    const connection = await Connection.create({
      investor: req.user.id,
      startup: startupId,
      initiatedBy: 'investor',
      message,
      investmentRange,
    });

    // Add investor to startup's interests array
    await Startup.findByIdAndUpdate(startupId, { $addToSet: { interests: req.user.id } });

    await connection.populate('investor', 'name avatar email');
    res.status(201).json({ success: true, connection });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Invite an investor to connect
// @route POST /api/connections/invite-investor
// @access Private (founder only)
const requestInvestorConnection = async (req, res) => {
  try {
    if (req.user.role !== 'founder') {
      return res.status(403).json({ success: false, message: 'Only founders can invite investors' });
    }

    const { investorId, startupId, message, investmentRange } = req.body;

    // Validate startup exists and is owned by the founder
    const startup = await Startup.findById(startupId);
    if (!startup) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }
    if (startup.founder.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not own this startup' });
    }

    // Validate investor exists and is an investor
    const investor = await User.findById(investorId);
    if (!investor) {
      return res.status(404).json({ success: false, message: 'Investor not found' });
    }
    if (investor.role !== 'investor') {
      return res.status(400).json({ success: false, message: 'Selected user is not an investor' });
    }

    // Validate duplicate connection (respecting the unique index on { investor, startup })
    const existing = await Connection.findOne({ investor: investorId, startup: startupId });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Connection request already exists for this investor and startup' });
    }

    const connection = await Connection.create({
      investor: investorId,
      startup: startupId,
      initiatedBy: 'founder',
      message,
      investmentRange,
    });

    // Add investor to startup's interests array to maintain consistency
    await Startup.findByIdAndUpdate(startupId, { $addToSet: { interests: investorId } });

    await connection.populate('investor', 'name avatar email');
    res.status(201).json({ success: true, connection });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get all connection requests received (founder view for investor-initiated, investor view for founder-initiated)
// @route GET /api/connections/received
// @access Private (founder or investor)
const getReceivedConnections = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'founder') {
      const myStartups = await Startup.find({ founder: req.user.id }).select('_id');
      const ids = myStartups.map((s) => s._id);
      query = { startup: { $in: ids }, initiatedBy: 'investor' };
    } else if (req.user.role === 'investor') {
      query = { investor: req.user.id, initiatedBy: 'founder' };
    } else {
      return res.status(403).json({ success: false, message: 'Invalid role' });
    }

    const connections = await Connection.find(query)
      .populate('investor', 'name avatar email bio location linkedin')
      .populate({
        path: 'startup',
        select: 'name tagline logo founder',
        populate: { path: 'founder', select: 'name email' }
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, connections });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get all connections sent (investor view for investor-initiated, founder view for founder-initiated)
// @route GET /api/connections/sent
// @access Private (founder or investor)
const getSentConnections = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'investor') {
      query = { investor: req.user.id, initiatedBy: 'investor' };
    } else if (req.user.role === 'founder') {
      const myStartups = await Startup.find({ founder: req.user.id }).select('_id');
      const ids = myStartups.map((s) => s._id);
      query = { startup: { $in: ids }, initiatedBy: 'founder' };
    } else {
      return res.status(403).json({ success: false, message: 'Invalid role' });
    }

    const connections = await Connection.find(query)
      .populate('investor', 'name avatar email bio location linkedin')
      .populate({
        path: 'startup',
        select: 'name tagline logo stage category founder',
        populate: { path: 'founder', select: 'name email' }
      })
      .sort({ createdAt: -1 });
    res.json({ success: true, connections });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Respond to a connection (accept/reject)
// @route PUT /api/connections/:id
// @access Private (founder or investor depending on initiator)
const respondToConnection = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    const connection = await Connection.findById(req.params.id).populate('startup');
    if (!connection) return res.status(404).json({ success: false, message: 'Connection not found' });

    if (connection.initiatedBy === 'founder') {
      if (req.user.role !== 'investor') {
        return res.status(403).json({ success: false, message: 'Only investors can respond to this connection request' });
      }
      if (connection.investor.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    } else { // initiatedBy === 'investor'
      if (req.user.role !== 'founder') {
        return res.status(403).json({ success: false, message: 'Only founders can respond to this connection request' });
      }
      if (connection.startup.founder.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    }

    connection.status = status;
    connection.respondedAt = new Date();
    await connection.save();

    res.json({ success: true, connection });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Withdraw connection
// @route DELETE /api/connections/:id
// @access Private (investor or founder depending on initiator)
const withdrawConnection = async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.id).populate('startup');
    if (!connection) return res.status(404).json({ success: false, message: 'Not found' });

    if (connection.initiatedBy === 'founder') {
      // If initiated by founder, the founder is authorized to withdraw it
      if (req.user.role !== 'founder') {
        return res.status(403).json({ success: false, message: 'Only founders can withdraw this connection request' });
      }
      if (connection.startup.founder.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    } else { // initiatedBy === 'investor'
      // If initiated by investor, the investor is authorized to withdraw it
      if (req.user.role !== 'investor') {
        return res.status(403).json({ success: false, message: 'Only investors can withdraw this connection request' });
      }
      if (connection.investor.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    }

    await connection.deleteOne();
    res.json({ success: true, message: 'Connection withdrawn' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  expressInterest,
  requestInvestorConnection,
  getReceivedConnections,
  getSentConnections,
  respondToConnection,
  withdrawConnection,
};

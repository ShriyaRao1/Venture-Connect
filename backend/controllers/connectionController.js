const Connection = require('../models/Connection');
const Startup = require('../models/Startup');

// @desc  Express interest in a startup
// @route POST /api/connections
// @access Private (investor)
const expressInterest = async (req, res) => {
  try {
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

// @desc  Get all connection requests for my startups (founder view)
// @route GET /api/connections/received
// @access Private (founder)
const getReceivedConnections = async (req, res) => {
  try {
    const myStartups = await Startup.find({ founder: req.user.id }).select('_id');
    const ids = myStartups.map((s) => s._id);

    const connections = await Connection.find({ startup: { $in: ids } })
      .populate('investor', 'name avatar email bio location linkedin')
      .populate('startup', 'name tagline logo')
      .sort({ createdAt: -1 });

    res.json({ success: true, connections });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get all connections I've made (investor view)
// @route GET /api/connections/sent
// @access Private (investor)
const getSentConnections = async (req, res) => {
  try {
    const connections = await Connection.find({ investor: req.user.id })
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
// @access Private (founder)
const respondToConnection = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    const connection = await Connection.findById(req.params.id).populate('startup');
    if (!connection) return res.status(404).json({ success: false, message: 'Connection not found' });
    if (connection.startup.founder.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not authorized' });

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
// @access Private (investor)
const withdrawConnection = async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.id);
    if (!connection) return res.status(404).json({ success: false, message: 'Not found' });
    if (connection.investor.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not authorized' });

    await connection.deleteOne();
    res.json({ success: true, message: 'Connection withdrawn' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { expressInterest, getReceivedConnections, getSentConnections, respondToConnection, withdrawConnection };

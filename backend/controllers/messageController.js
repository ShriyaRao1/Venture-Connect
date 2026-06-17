const Message = require('../models/Message');

// @desc  Send a message
// @route POST /api/messages
// @access Private
const sendMessage = async (req, res) => {
  try {
    const { receiverId, content, relatedStartup } = req.body;
    if (receiverId === req.user.id)
      return res.status(400).json({ success: false, message: 'Cannot message yourself' });

    const message = await Message.create({
      sender: req.user.id,
      receiver: receiverId,
      content,
      relatedStartup: relatedStartup || null,
    });
    await message.populate('sender', 'name avatar');
    await message.populate('receiver', 'name avatar');
    res.status(201).json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get conversation with a user
// @route GET /api/messages/:userId
// @access Private
const getConversation = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user.id },
      ],
    })
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar')
      .sort({ createdAt: 1 });

    // Mark as read
    await Message.updateMany(
      { sender: req.params.userId, receiver: req.user.id, isRead: false },
      { isRead: true }
    );

    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get all conversations (inbox) - latest message per user
// @route GET /api/messages
// @access Private
const getInbox = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }],
    })
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar')
      .sort({ createdAt: -1 });

    // Deduplicate by conversation partner
    const seen = new Set();
    const inbox = [];
    for (const msg of messages) {
      const partnerId =
        msg.sender._id.toString() === req.user.id ? msg.receiver._id.toString() : msg.sender._id.toString();
      if (!seen.has(partnerId)) {
        seen.add(partnerId);
        inbox.push(msg);
      }
    }
    res.json({ success: true, inbox });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get unread count
// @route GET /api/messages/unread/count
// @access Private
const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({ receiver: req.user.id, isRead: false });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { sendMessage, getConversation, getInbox, getUnreadCount };

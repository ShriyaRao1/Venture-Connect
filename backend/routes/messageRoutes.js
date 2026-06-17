const express = require('express');
const router = express.Router();
const { sendMessage, getConversation, getInbox, getUnreadCount } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.post('/', sendMessage);
router.get('/unread/count', getUnreadCount);
router.get('/', getInbox);
router.get('/:userId', getConversation);

module.exports = router;

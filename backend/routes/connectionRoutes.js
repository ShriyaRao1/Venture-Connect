const express = require('express');
const router = express.Router();
const {
  expressInterest, getReceivedConnections,
  getSentConnections, respondToConnection, withdrawConnection,
} = require('../controllers/connectionController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.post('/', expressInterest);
router.get('/received', getReceivedConnections);
router.get('/sent', getSentConnections);
router.put('/:id', respondToConnection);
router.delete('/:id', withdrawConnection);

module.exports = router;

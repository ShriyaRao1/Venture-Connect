const express = require('express');
const router = express.Router();
const {
  expressInterest, requestInvestorConnection, getReceivedConnections,
  getSentConnections, respondToConnection, withdrawConnection,
} = require('../controllers/connectionController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.use(protect);
router.post('/', authorizeRoles('investor'), expressInterest);
router.post('/invite-investor', authorizeRoles('founder'), requestInvestorConnection);
router.get('/received', getReceivedConnections);
router.get('/sent', getSentConnections);
router.put('/:id', respondToConnection);
router.delete('/:id', withdrawConnection);

module.exports = router;

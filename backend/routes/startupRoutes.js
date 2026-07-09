const express = require('express');
const router = express.Router();
const {
  createStartup, getStartups, getStartup,
  updateStartup, deleteStartup, getMyStartups, toggleSaveStartup,
  addFundingRound, investInRound,
} = require('../controllers/startupController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getStartups);
router.get('/my', protect, getMyStartups);
router.post('/', protect, createStartup);
router.get('/:id', getStartup);
router.put('/:id', protect, updateStartup);
router.delete('/:id', protect, deleteStartup);
router.post('/:id/save', protect, toggleSaveStartup);
router.post('/:id/rounds', protect, addFundingRound);
router.post('/:id/invest', protect, investInRound);

module.exports = router;

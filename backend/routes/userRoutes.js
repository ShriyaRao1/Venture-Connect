const express = require('express');
const router = express.Router();
const {
  getInvestors, getUserProfile, updateProfile, updatePassword, getSavedStartups,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/investors', getInvestors);
router.get('/saved', protect, getSavedStartups);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, updatePassword);
router.get('/:id', getUserProfile);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  getInvestors, getInvestor, getUserProfile, updateProfile, updatePassword, getSavedStartups,
  toggleSaveInvestor, getSavedInvestors,
} = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/investors', getInvestors);
router.get('/investors/:id', getInvestor);
router.get('/saved', protect, getSavedStartups);
router.get('/saved-investors', protect, authorizeRoles('founder'), getSavedInvestors);
router.post('/:id/save-investor', protect, authorizeRoles('founder'), toggleSaveInvestor);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, updatePassword);
router.get('/:id', getUserProfile);

module.exports = router;

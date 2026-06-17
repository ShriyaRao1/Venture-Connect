const express = require('express');
const router = express.Router();
const {
  createStartup, getStartups, getStartup,
  updateStartup, deleteStartup, getMyStartups, toggleSaveStartup,
} = require('../controllers/startupController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getStartups);
router.get('/my', protect, getMyStartups);
router.post('/', protect, createStartup);
router.get('/:id', getStartup);
router.put('/:id', protect, updateStartup);
router.delete('/:id', protect, deleteStartup);
router.post('/:id/save', protect, toggleSaveStartup);

module.exports = router;

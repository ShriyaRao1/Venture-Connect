const express = require('express');
const router  = express.Router();
const {
  getStats, getAllUsers, updateUserRole, deleteUser,
  getAllStartups, deleteStartup, getPublicStats,
} = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const adminOnly = [protect, authorizeRoles('admin')];

// Public
router.get('/public-stats', getPublicStats);

// Admin only
router.get('/stats',              ...adminOnly, getStats);
router.get('/users',              ...adminOnly, getAllUsers);
router.put('/users/:id/role',     ...adminOnly, updateUserRole);
router.delete('/users/:id',       ...adminOnly, deleteUser);
router.get('/startups',           ...adminOnly, getAllStartups);
router.delete('/startups/:id',    ...adminOnly, deleteStartup);

module.exports = router;

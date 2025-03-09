const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyToken, checkRole, isVerified } = require('../middleware/auth.middleware');

// All routes require admin authentication
router.use(verifyToken);
router.use(isVerified);
router.use(checkRole('admin'));

// User Management Routes
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/status', adminController.updateUserStatus);
router.delete('/users/:userId', adminController.deleteUser);

// Analytics Routes
router.get('/analytics/sales', adminController.getSalesAnalytics);
router.get('/analytics/revenue', adminController.getRevenueReports);

module.exports = router; 
const express = require('express');
const router = express.Router();
const exportController = require('../controllers/export.controller');
const { verifyToken, checkRole, isVerified } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);
router.use(isVerified);

// Export orders (all authenticated users)
router.get('/orders', exportController.exportOrders);

// Export inventory (farmers and vendors only)
router.get(
  '/inventory',
  checkRole('farmer', 'vendor'),
  exportController.exportInventory
);

// Export sales analytics (all authenticated users)
router.get('/analytics', exportController.exportSalesAnalytics);

module.exports = router; 
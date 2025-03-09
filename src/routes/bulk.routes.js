const express = require('express');
const router = express.Router();
const bulkController = require('../controllers/bulk.controller');
const { verifyToken, checkRole, isVerified } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);
router.use(isVerified);

// Create bulk order (consumer only)
router.post(
  '/orders',
  checkRole('consumer'),
  bulkController.createBulkOrder
);

// Create farmer-vendor bulk purchase (vendor only)
router.post(
  '/farmer-purchase',
  checkRole('vendor'),
  bulkController.createFarmerPurchase
);

// Get bulk orders (filtered by role)
router.get(
  '/orders',
  bulkController.getBulkOrders
);

// Update bulk order status (vendor/farmer only)
router.put(
  '/orders/:id/status',
  checkRole('vendor', 'farmer'),
  bulkController.updateBulkOrderStatus
);

// Get bulk order analytics (all roles)
router.get(
  '/analytics',
  bulkController.getBulkOrderAnalytics
);

module.exports = router; 
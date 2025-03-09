const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { verifyToken, checkRole, isVerified } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);
router.use(isVerified);
router.use(checkRole('farmer', 'vendor'));

// Set alert thresholds for a product
router.put(
  '/alerts/:productId/thresholds',
  inventoryController.setAlertThresholds
);

// Get inventory alerts
router.get(
  '/alerts',
  inventoryController.getInventoryAlerts
);

// Enable/disable alerts for a product
router.put(
  '/alerts/:productId/toggle',
  inventoryController.toggleAlerts
);

// Get alert settings for a product
router.get(
  '/alerts/:productId/settings',
  inventoryController.getAlertSettings
);

module.exports = router; 
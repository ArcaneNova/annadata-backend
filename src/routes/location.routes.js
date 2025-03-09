const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const { verifyToken, checkRole, isVerified } = require('../middleware/auth.middleware');

// Public route - no authentication required
router.get('/nearby', locationController.getNearbyVendors);

// Protected routes - require authentication
router.use(verifyToken);
router.use(isVerified);

// Update vendor location (vendor only)
router.post(
  '/update',
  checkRole('vendor'),
  locationController.updateLocation
);

// Get vendor location (all roles)
router.get(
  '/vendor/:id',
  locationController.getVendorLocation
);

// Subscribe to vendor location updates (consumer only)
router.post(
  '/subscribe/:vendorId',
  checkRole('consumer'),
  locationController.subscribeToVendor
);

// Unsubscribe from vendor location updates (consumer only)
router.post(
  '/unsubscribe/:vendorId',
  checkRole('consumer'),
  locationController.unsubscribeFromVendor
);

module.exports = router; 
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { verifyToken, checkRole, isVerified } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);
router.use(isVerified);

// Create order (consumer only)
router.post(
  '/',
  checkRole('consumer'),
  orderController.createOrder
);

// Verify payment
router.post(
  '/verify-payment',
  checkRole('consumer'),
  orderController.verifyPayment
);

// Get vendor orders (vendor only)
router.get(
  '/vendor',
  checkRole('vendor'),
  orderController.getVendorOrders
);

// Update order status (vendor/farmer only)
router.put(
  '/:id/status',
  checkRole('vendor', 'farmer'),
  orderController.updateOrderStatus
);

// Cancel order (all roles)
router.post(
  '/:id/cancel',
  orderController.cancelOrder
);

// Get orders
router.get('/', orderController.getOrders);

// Get single order
router.get('/:id', orderController.getOrder);

module.exports = router; 
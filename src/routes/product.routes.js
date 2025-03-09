const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { verifyToken, checkRole, isVerified } = require('../middleware/auth.middleware');
const { upload } = require('../utils/upload.util');

// Public routes - no authentication required
router.get('/public', productController.getPublicProducts);
router.get('/public/:id', productController.getProduct);

// Protected routes - require authentication
router.use(verifyToken);
router.use(isVerified);

// Vendor specific routes
router.get('/vendor/own', checkRole('vendor'), productController.getVendorOwnProducts);
router.post('/vendor/products', checkRole('vendor'), upload.array('images', 5), productController.createProduct);
router.put('/vendor/products/:id', checkRole('vendor'), upload.array('images', 5), productController.updateProduct);
router.delete('/vendor/products/:id', checkRole('vendor'), productController.deleteProduct);
router.get('/vendor/analytics', checkRole('vendor'), productController.getVendorProductAnalytics);
router.get('/vendor/analytics/:productId', checkRole('vendor'), productController.getVendorProductAnalytics);
router.get('/vendor/:vendorId', productController.getVendorProducts);
router.put('/vendor/products/:id/margin', checkRole('vendor'), productController.updateMargin);

// Farmer specific routes
router.get('/farmer/:farmerId', productController.getFarmerProducts);
router.post('/farmer/products', checkRole('farmer'), upload.array('images', 5), productController.createProduct);
router.put('/farmer/products/:id', checkRole('farmer'), upload.array('images', 5), productController.updateProduct);
router.delete('/farmer/products/:id', checkRole('farmer'), productController.deleteProduct);

// General product routes
router.get('/', productController.getProducts);
router.get('/:id', productController.getProduct);

// Vendor marketplace route
router.get('/marketplace/farmers', verifyToken, checkRole('vendor'), productController.getFarmerProducts);

// Admin routes
router.put('/:id/margin', checkRole('admin'), productController.updateMargin);

module.exports = router; 
const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/rating.controller');
const { verifyToken, checkRole, isVerified } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);
router.use(isVerified);

// Product rating routes
router.post(
  '/products/:productId',
  checkRole('consumer'),
  ratingController.addProductRating
);

router.put(
  '/products/:productId',
  checkRole('consumer'),
  ratingController.updateProductRating
);

router.delete(
  '/products/:productId',
  checkRole('consumer'),
  ratingController.deleteProductRating
);

router.get(
  '/products/:productId',
  ratingController.getProductRatings
);

// User rating routes (for vendors and farmers)
router.post(
  '/users/:userId',
  checkRole('consumer'),
  ratingController.addUserRating
);

router.put(
  '/users/:userId',
  checkRole('consumer'),
  ratingController.updateUserRating
);

router.delete(
  '/users/:userId',
  checkRole('consumer'),
  ratingController.deleteUserRating
);

router.get(
  '/users/:userId',
  ratingController.getUserRatings
);

module.exports = router; 
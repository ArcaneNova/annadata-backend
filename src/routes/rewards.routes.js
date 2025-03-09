const express = require('express');
const router = express.Router();
const rewardsController = require('../controllers/rewards.controller');
const { verifyToken, isVerified } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);
router.use(isVerified);

// Referral Routes
router.get('/referral/code', rewardsController.generateReferralCode);
router.post('/referral/apply', rewardsController.applyReferralCode);
router.get('/referral/stats', rewardsController.getReferralStats);

// Loyalty Points Routes
router.get('/loyalty/status', rewardsController.getLoyaltyStatus);
router.post('/loyalty/redeem', rewardsController.redeemPoints);

module.exports = router; 
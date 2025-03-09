const User = require('../models/user.model');
const Order = require('../models/order.model');

// Constants for rewards
const REFERRAL_POINTS = 500;
const REFERRAL_BONUS = 200;
const POINTS_PER_RUPEE = 1;
const MIN_POINTS_REDEMPTION = 1000;
const POINTS_TO_RUPEE_RATIO = 0.1;

// Referral System
const generateReferralCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.referralCode) {
      user.generateReferralCode();
      await user.save();
    }

    res.json({
      referralCode: user.referralCode
    });
  } catch (error) {
    console.error('Generate referral code error:', error);
    res.status(500).json({ message: 'Error generating referral code' });
  }
};

const applyReferralCode = async (req, res) => {
  try {
    const { referralCode } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.referredBy) {
      return res.status(400).json({ message: 'Referral code already applied' });
    }

    const referrer = await User.findOne({ referralCode });
    if (!referrer) {
      return res.status(404).json({ message: 'Invalid referral code' });
    }

    if (referrer._id.toString() === user._id.toString()) {
      return res.status(400).json({ message: 'Cannot use own referral code' });
    }

    // Update referrer stats
    referrer.referralCount += 1;
    referrer.referralEarnings += REFERRAL_BONUS;
    await referrer.addLoyaltyPoints(REFERRAL_POINTS, 'earned', 'referral', null, 'Referral bonus');

    // Update referred user
    user.referredBy = referrer._id;
    await user.addLoyaltyPoints(REFERRAL_POINTS, 'earned', 'referral', null, 'Welcome bonus');

    await Promise.all([referrer.save(), user.save()]);

    res.json({
      message: 'Referral code applied successfully',
      pointsEarned: REFERRAL_POINTS
    });
  } catch (error) {
    console.error('Apply referral code error:', error);
    res.status(500).json({ message: 'Error applying referral code' });
  }
};

const getReferralStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('referredBy', 'name email');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const referredUsers = await User.find({ referredBy: user._id })
      .select('name email createdAt');

    res.json({
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      referralCount: user.referralCount,
      referralEarnings: user.referralEarnings,
      referredUsers
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({ message: 'Error fetching referral stats' });
  }
};

// Loyalty Points System
const getLoyaltyStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('loyaltyPoints loyaltyTier pointsHistory');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get points history with pagination
    const { page = 1, limit = 10 } = req.query;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedHistory = user.pointsHistory
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(startIndex, endIndex);

    res.json({
      loyaltyPoints: user.loyaltyPoints,
      loyaltyTier: user.loyaltyTier,
      pointsHistory: paginatedHistory,
      nextTier: user.calculateLoyaltyTier(),
      pointsToNextTier: user.loyaltyTier === 'platinum' ? 0 : 
        user.loyaltyTier === 'gold' ? 10000 - user.loyaltyPoints :
        user.loyaltyTier === 'silver' ? 5000 - user.loyaltyPoints :
        2000 - user.loyaltyPoints,
      page: Number(page),
      totalPages: Math.ceil(user.pointsHistory.length / limit)
    });
  } catch (error) {
    console.error('Get loyalty status error:', error);
    res.status(500).json({ message: 'Error fetching loyalty status' });
  }
};

const redeemPoints = async (req, res) => {
  try {
    const { points } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (points < MIN_POINTS_REDEMPTION) {
      return res.status(400).json({ 
        message: `Minimum ${MIN_POINTS_REDEMPTION} points required for redemption` 
      });
    }

    if (points > user.loyaltyPoints) {
      return res.status(400).json({ message: 'Insufficient points' });
    }

    const cashbackAmount = points * POINTS_TO_RUPEE_RATIO;
    await user.redeemLoyaltyPoints(points, `Redeemed for ₹${cashbackAmount} cashback`);

    res.json({
      message: 'Points redeemed successfully',
      pointsRedeemed: points,
      cashbackAmount,
      remainingPoints: user.loyaltyPoints
    });
  } catch (error) {
    console.error('Redeem points error:', error);
    res.status(500).json({ message: 'Error redeeming points' });
  }
};

// Points calculation for orders
const calculateOrderPoints = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order || order.status !== 'delivered') return 0;

    const pointsEarned = Math.floor(order.totalAmount * POINTS_PER_RUPEE);
    const buyer = await User.findById(order.buyer);

    if (buyer) {
      await buyer.addLoyaltyPoints(
        pointsEarned,
        'earned',
        'purchase',
        orderId,
        `Points earned for order #${order._id}`
      );
    }

    return pointsEarned;
  } catch (error) {
    console.error('Calculate order points error:', error);
    return 0;
  }
};

module.exports = {
  generateReferralCode,
  applyReferralCode,
  getReferralStats,
  getLoyaltyStatus,
  redeemPoints,
  calculateOrderPoints
}; 
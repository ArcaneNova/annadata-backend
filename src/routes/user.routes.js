const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const { verifyToken, checkRole, isVerified } = require('../middleware/auth.middleware');

// Protect all routes
router.use(verifyToken);

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -verificationToken -resetPasswordToken -resetPasswordExpires');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const updates = req.body;
    const userRole = req.user.role;
    
    // Remove sensitive fields that shouldn't be updated directly
    const restrictedFields = [
      'password', 'email', 'role', 'isVerified', 'verificationToken',
      'resetPasswordToken', 'resetPasswordExpires', 'loyaltyPoints',
      'loyaltyTier', 'referralCode', 'referralCount', 'referralEarnings'
    ];
    
    restrictedFields.forEach(field => delete updates[field]);
    
    // Validate role-specific required fields
    if (userRole === 'farmer') {
      const requiredFields = ['farmName', 'farmLocation', 'farmSize', 'primaryCrops'];
      for (const field of requiredFields) {
        if (updates[field] !== undefined && !updates[field]) {
          return res.status(400).json({ message: `${field} is required for farmers` });
        }
      }
    } else if (userRole === 'vendor') {
      const requiredFields = ['businessName', 'businessLocation', 'businessType', 'gstNumber'];
      for (const field of requiredFields) {
        if (updates[field] !== undefined && !updates[field]) {
          return res.status(400).json({ message: `${field} is required for vendors` });
        }
      }
    } else if (userRole === 'consumer') {
      const requiredFields = ['address', 'city', 'state', 'pincode'];
      for (const field of requiredFields) {
        if (updates[field] !== undefined && !updates[field]) {
          return res.status(400).json({ message: `${field} is required for consumers` });
        }
      }
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -verificationToken -resetPasswordToken -resetPasswordExpires');
    
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      message: 'Error updating user profile',
      details: error.message 
    });
  }
});

// Get user addresses (for consumers)
router.get('/addresses', checkRole('consumer'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('address city state pincode');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Format addresses for response
    const addresses = [{
      id: '1', // Default address ID
      street: user.address,
      city: user.city,
      state: user.state,
      pincode: user.pincode
    }];
    
    res.json({ addresses });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ message: 'Error fetching user addresses' });
  }
});

// Get user loyalty points (for consumers)
router.get('/loyalty-points', checkRole('consumer'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('loyaltyPoints loyaltyTier pointsHistory');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      points: user.loyaltyPoints,
      tier: user.loyaltyTier,
      history: user.pointsHistory
    });
  } catch (error) {
    console.error('Get loyalty points error:', error);
    res.status(500).json({ message: 'Error fetching loyalty points' });
  }
});

// Get user ratings (for vendors and farmers)
router.get('/ratings', checkRole('vendor', 'farmer'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('ratings averageRating')
      .populate('ratings.user', 'name');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      ratings: user.ratings,
      averageRating: user.averageRating
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ message: 'Error fetching user ratings' });
  }
});

// Get user's support tickets
router.get('/support-tickets', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('supportTickets')
      .populate('supportTickets.assignedTo', 'name');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ tickets: user.supportTickets });
  } catch (error) {
    console.error('Get support tickets error:', error);
    res.status(500).json({ message: 'Error fetching support tickets' });
  }
});

// Get user's referral information
router.get('/referrals', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('referralCode referralCount referralEarnings')
      .populate('referredBy', 'name');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      referralCode: user.referralCode,
      referralCount: user.referralCount,
      referralEarnings: user.referralEarnings,
      referredBy: user.referredBy
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ message: 'Error fetching referral information' });
  }
});

// Generate new referral code
router.post('/generate-referral-code', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const referralCode = user.generateReferralCode();
    await user.save();
    
    res.json({ referralCode });
  } catch (error) {
    console.error('Generate referral code error:', error);
    res.status(500).json({ message: 'Error generating referral code' });
  }
});

module.exports = router; 
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user.model');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email.util');

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register user
const register = async (req, res) => {
  try {
    const { role } = req.body;
    let userData = {};

    // Common fields for all roles
    const commonFields = ['name', 'email', 'password', 'phone'];
    commonFields.forEach(field => {
      if (req.body[field]) userData[field] = req.body[field];
    });

    // Role-specific fields
    if (role === 'farmer') {
      const farmerFields = ['farmLocation', 'farmName', 'farmSize', 'primaryCrops'];
      farmerFields.forEach(field => {
        if (req.body[field]) userData[field] = req.body[field];
      });
    } else if (role === 'vendor') {
      const vendorFields = ['businessLocation', 'businessName', 'businessType', 'gstNumber'];
      vendorFields.forEach(field => {
        if (req.body[field]) userData[field] = req.body[field];
      });
    } else if (role === 'consumer') {
      const consumerFields = ['address', 'city', 'pincode', 'state'];
      consumerFields.forEach(field => {
        if (req.body[field]) userData[field] = req.body[field];
      });
    }

    // Add role to userData
    userData.role = role;

    // Check if user exists with email or phone
    const existingUser = await User.findOne({
      $or: [
        { email: userData.email },
        { phone: userData.phone }
      ]
    });

    if (existingUser) {
      if (existingUser.email === userData.email) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      if (existingUser.phone === userData.phone) {
        return res.status(400).json({ message: 'Phone number already registered' });
      }
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate verification token
    const verificationToken = generateOTP();
    userData.verificationToken = verificationToken;

    // Create user
    const user = new User(userData);
    await user.save();

    // Send verification email
    await sendVerificationEmail(userData.email, verificationToken);

    res.status(201).json({
      message: 'Registration successful. Please check your email for verification.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    // Handle specific MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `${field === 'email' ? 'Email' : 'Phone number'} already registered`
      });
    }
    res.status(500).json({ message: 'Error registering user' });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Error verifying email' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user's role matches the requested role
    if (user.role !== role) {
      return res.status(403).json({ message: `Access denied. Please use the correct login endpoint for ${user.role} role.` });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email first' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token
    const resetToken = generateOTP();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset email
    await sendPasswordResetEmail(email, resetToken);

    res.json({ message: 'Password reset instructions sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing request' });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};

// Resend verification email
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, isVerified: false });
    if (!user) {
      return res.status(400).json({ message: 'Invalid request or email already verified' });
    }

    // Generate new verification token
    const verificationToken = generateOTP();
    user.verificationToken = verificationToken;
    await user.save();

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    res.json({ message: 'Verification email resent successfully' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Error resending verification email' });
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  resendVerification
}; 
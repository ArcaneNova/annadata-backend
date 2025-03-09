const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Middleware to validate role-specific fields
const validateRegistrationFields = (role, requiredFields) => {
  return (req, res, next) => {
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields for ${role} registration: ${missingFields.join(', ')}`
      });
    }
    req.body.role = role;
    next();
  };
};

// Register routes with field validation
router.post('/register/farmer', 
  validateRegistrationFields('farmer', [
    'name', 'email', 'password', 'phone',
    'farmLocation', 'farmName', 'farmSize', 'primaryCrops'
  ]),
  authController.register
);

router.post('/register/vendor',
  validateRegistrationFields('vendor', [
    'name', 'email', 'password', 'phone',
    'businessLocation', 'businessName', 'businessType', 'gstNumber'
  ]),
  authController.register
);

router.post('/register/consumer',
  validateRegistrationFields('consumer', [
    'name', 'email', 'password', 'phone',
    'address', 'city', 'pincode', 'state'
  ]),
  authController.register
);

router.post('/register/admin',
  validateRegistrationFields('admin', [
    'name', 'email', 'password', 'phone'
  ]),
  authController.register
);

// Login routes with role validation
router.post('/login/farmer', (req, res) => {
  req.body.role = 'farmer';
  authController.login(req, res);
});

router.post('/login/vendor', (req, res) => {
  req.body.role = 'vendor';
  authController.login(req, res);
});

router.post('/login/consumer', (req, res) => {
  req.body.role = 'consumer';
  authController.login(req, res);
});

router.post('/login/admin', (req, res) => {
  req.body.role = 'admin';
  authController.login(req, res);
});

// Email verification routes
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

// Password reset routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
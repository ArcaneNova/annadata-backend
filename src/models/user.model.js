const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['farmer', 'vendor', 'consumer', 'admin'],
    required: true
  },
  // Farmer specific fields
  farmName: {
    type: String,
    required: function() { return this.role === 'farmer'; }
  },
  farmLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: {
      type: String,
      required: function() { return this.role === 'farmer'; }
    }
  },
  farmSize: {
    type: String,
    required: function() { return this.role === 'farmer'; }
  },
  primaryCrops: {
    type: [String],
    required: function() { return this.role === 'farmer'; }
  },
  // Vendor specific fields
  businessName: {
    type: String,
    required: function() { return this.role === 'vendor'; }
  },
  businessLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: String
  },
  businessType: {
    type: String,
    required: function() { return this.role === 'vendor'; }
  },
  gstNumber: {
    type: String,
    required: function() { return this.role === 'vendor'; }
  },
  // Consumer specific fields
  address: {
    type: String,
    required: function() { return this.role === 'consumer'; }
  },
  city: {
    type: String,
    required: function() { return this.role === 'consumer'; }
  },
  state: {
    type: String,
    required: function() { return this.role === 'consumer'; }
  },
  pincode: {
    type: String,
    required: function() { return this.role === 'consumer'; }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  // Common fields
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0
  },
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  loyaltyTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  pointsHistory: [{
    points: Number,
    type: {
      type: String,
      enum: ['earned', 'redeemed']
    },
    description: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralCount: {
    type: Number,
    default: 0
  },
  referralEarnings: {
    type: Number,
    default: 0
  },
  supportTickets: [{
    title: String,
    description: String,
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      default: 'open'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: Date,
    resolution: String
  }],
  avatar: {
    url: String,
    public_id: String
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Create indexes
userSchema.index({ 
  "businessLocation.coordinates": "2dsphere"
}, { 
  name: "vendor_location_2dsphere",
  background: true,
  partialFilterExpression: { 
    role: "vendor",
    isVerified: true,
    "businessLocation.type": "Point",
    "businessLocation.coordinates": { $exists: true }
  }
});

userSchema.index({ email: 1 }, { unique: true, name: "email_unique", background: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to calculate average rating
userSchema.methods.calculateAverageRating = function() {
  if (this.ratings.length === 0) return 0;
  
  const sum = this.ratings.reduce((acc, curr) => acc + curr.rating, 0);
  return sum / this.ratings.length;
};

// Generate unique referral code
userSchema.methods.generateReferralCode = function() {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  this.referralCode = code;
  return code;
};

// Calculate loyalty tier based on points
userSchema.methods.calculateLoyaltyTier = function() {
  if (this.loyaltyPoints >= 10000) {
    this.loyaltyTier = 'platinum';
  } else if (this.loyaltyPoints >= 5000) {
    this.loyaltyTier = 'gold';
  } else if (this.loyaltyPoints >= 2000) {
    this.loyaltyTier = 'silver';
  } else {
    this.loyaltyTier = 'bronze';
  }
  return this.loyaltyTier;
};

// Add loyalty points
userSchema.methods.addLoyaltyPoints = async function(points, type, source, orderId = null, description = '') {
  this.loyaltyPoints += points;
  this.pointsHistory.push({
    points,
    type: 'earned',
    source,
    orderId,
    description
  });
  this.calculateLoyaltyTier();
  await this.save();
};

// Redeem loyalty points
userSchema.methods.redeemLoyaltyPoints = async function(points, description = '') {
  if (points > this.loyaltyPoints) {
    throw new Error('Insufficient loyalty points');
  }
  
  this.loyaltyPoints -= points;
  this.pointsHistory.push({
    points,
    type: 'redeemed',
    source: 'redemption',
    description
  });
  this.calculateLoyaltyTier();
  await this.save();
};

// Method to generate authentication token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { userId: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Update average rating
userSchema.methods.updateAverageRating = function() {
  if (!this.ratings || this.ratings.length === 0) {
    this.averageRating = 0;
    return;
  }
  
  const sum = this.ratings.reduce((acc, curr) => acc + curr.rating, 0);
  this.averageRating = sum / this.ratings.length;
};

// Method to set business location
userSchema.methods.setBusinessLocation = function(coordinates, address) {
  if (this.role !== 'vendor') {
    throw new Error('Only vendors can set business location');
  }
  
  this.businessLocation = {
    type: 'Point',
    coordinates: coordinates, // [longitude, latitude]
    address: address
  };
};

// Ensure businessLocation is a proper GeoJSON Point before saving
userSchema.pre('save', async function(next) {
  if (this.role === 'vendor') {
    if (!this.businessLocation) {
      this.businessLocation = {
        type: 'Point',
        coordinates: [0, 0]
      };
    }
    
    if (!this.businessLocation.type) {
      this.businessLocation.type = 'Point';
    }
    
    if (Array.isArray(this.businessLocation.coordinates) && 
        this.businessLocation.coordinates.length === 2) {
      // Ensure coordinates are numbers and in the correct range
      const [lng, lat] = this.businessLocation.coordinates.map(Number);
      if (!isNaN(lng) && !isNaN(lat) && 
          lng >= -180 && lng <= 180 && 
          lat >= -90 && lat <= 90) {
        this.businessLocation.coordinates = [lng, lat];
      } else {
        console.warn('Invalid coordinates for vendor:', this._id);
      }
    } else {
      console.warn('Missing or invalid coordinates for vendor:', this._id);
    }
  }
  next();
});

// Add a method to validate and update vendor location
userSchema.methods.updateVendorLocation = function(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    throw new Error('Invalid coordinates format');
  }

  const [lng, lat] = coordinates.map(Number);
  if (isNaN(lng) || isNaN(lat) || 
      lng < -180 || lng > 180 || 
      lat < -90 || lat > 90) {
    throw new Error('Invalid coordinates values');
  }

  this.businessLocation = {
    type: 'Point',
    coordinates: [lng, lat]
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User; 
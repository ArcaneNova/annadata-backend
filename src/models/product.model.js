const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['vegetables', 'fruits', 'crops', 'dairy', 'groceries', 'snacks', 'beverages', 'other']
  },
  images: [{
    url: String,
    public_id: String
  }],
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'gram', 'piece', 'dozen', 'liter', 'packet', 'box', 'carton']
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerType: {
    type: String,
    required: true,
    enum: ['farmer', 'vendor']
  },
  // For vendor products
  marginPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  basePrice: {
    type: Number,
    min: 0
  },
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
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
  totalRatings: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for searching
productSchema.index({ name: 'text', description: 'text' });

// Method to calculate average rating
productSchema.methods.calculateAverageRating = function() {
  if (this.ratings.length === 0) return 0;
  
  const sum = this.ratings.reduce((acc, curr) => acc + curr.rating, 0);
  this.averageRating = sum / this.ratings.length;
  this.totalRatings = this.ratings.length;
  return this.averageRating;
};

// Method to calculate final price with margin
productSchema.methods.calculateFinalPrice = function() {
  if (this.sellerType === 'vendor' && this.basePrice) {
    return this.basePrice * (1 + this.marginPercentage / 100);
  }
  return this.price;
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product; 
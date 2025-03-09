const Product = require('../models/product.model');
const User = require('../models/user.model');
const Order = require('../models/order.model');

// Add product rating and review
const addProductRating = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user._id;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user has purchased the product
    const order = await Order.findOne({
      buyer: userId,
      'items.product': productId,
      status: 'delivered'
    });

    if (!order) {
      return res.status(403).json({ 
        message: 'You can only rate products you have purchased and received' 
      });
    }

    // Check if user has already rated
    const existingRating = product.ratings.find(
      r => r.user.toString() === userId.toString()
    );

    if (existingRating) {
      return res.status(400).json({ message: 'You have already rated this product' });
    }

    // Add rating
    product.ratings.push({
      user: userId,
      rating,
      review,
      createdAt: new Date()
    });

    // Calculate new average rating
    product.calculateAverageRating();
    await product.save();

    // Notify seller about new rating
    const io = req.app.get('io');
    io.to(product.seller.toString()).emit('newRating', {
      productId: product._id,
      productName: product.name,
      rating,
      review
    });

    res.json({
      message: 'Rating added successfully',
      rating: {
        rating,
        review,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Add product rating error:', error);
    res.status(500).json({ message: 'Error adding rating' });
  }
};

// Update product rating
const updateProductRating = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user._id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find user's rating
    const ratingIndex = product.ratings.findIndex(
      r => r.user.toString() === userId.toString()
    );

    if (ratingIndex === -1) {
      return res.status(404).json({ message: 'Rating not found' });
    }

    // Update rating
    product.ratings[ratingIndex].rating = rating;
    product.ratings[ratingIndex].review = review;

    // Recalculate average rating
    product.calculateAverageRating();
    await product.save();

    res.json({
      message: 'Rating updated successfully',
      rating: product.ratings[ratingIndex]
    });
  } catch (error) {
    console.error('Update product rating error:', error);
    res.status(500).json({ message: 'Error updating rating' });
  }
};

// Delete product rating
const deleteProductRating = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Remove rating
    product.ratings = product.ratings.filter(
      r => r.user.toString() !== userId.toString()
    );

    // Recalculate average rating
    product.calculateAverageRating();
    await product.save();

    res.json({ message: 'Rating deleted successfully' });
  } catch (error) {
    console.error('Delete product rating error:', error);
    res.status(500).json({ message: 'Error deleting rating' });
  }
};

// Add vendor/farmer rating
const addUserRating = async (req, res) => {
  try {
    const { userId } = req.params;
    const { rating, review } = req.body;
    const reviewerId = req.user._id;

    // Check if user exists and is a vendor or farmer
    const user = await User.findOne({
      _id: userId,
      role: { $in: ['vendor', 'farmer'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if reviewer has ordered from this user
    const order = await Order.findOne({
      buyer: reviewerId,
      seller: userId,
      status: 'delivered'
    });

    if (!order) {
      return res.status(403).json({ 
        message: 'You can only rate vendors/farmers you have ordered from' 
      });
    }

    // Check if already rated
    const existingRating = user.ratings.find(
      r => r.user.toString() === reviewerId.toString()
    );

    if (existingRating) {
      return res.status(400).json({ message: 'You have already rated this user' });
    }

    // Add rating
    user.ratings.push({
      user: reviewerId,
      rating,
      review,
      createdAt: new Date()
    });

    // Calculate new average rating
    user.calculateAverageRating();
    await user.save();

    // Notify user about new rating
    const io = req.app.get('io');
    io.to(userId.toString()).emit('newUserRating', {
      rating,
      review,
      reviewer: {
        _id: reviewerId,
        name: req.user.name
      }
    });

    res.json({
      message: 'Rating added successfully',
      rating: {
        rating,
        review,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Add user rating error:', error);
    res.status(500).json({ message: 'Error adding rating' });
  }
};

// Update vendor/farmer rating
const updateUserRating = async (req, res) => {
  try {
    const { userId } = req.params;
    const { rating, review } = req.body;
    const reviewerId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find rating
    const ratingIndex = user.ratings.findIndex(
      r => r.user.toString() === reviewerId.toString()
    );

    if (ratingIndex === -1) {
      return res.status(404).json({ message: 'Rating not found' });
    }

    // Update rating
    user.ratings[ratingIndex].rating = rating;
    user.ratings[ratingIndex].review = review;

    // Recalculate average rating
    user.calculateAverageRating();
    await user.save();

    res.json({
      message: 'Rating updated successfully',
      rating: user.ratings[ratingIndex]
    });
  } catch (error) {
    console.error('Update user rating error:', error);
    res.status(500).json({ message: 'Error updating rating' });
  }
};

// Delete vendor/farmer rating
const deleteUserRating = async (req, res) => {
  try {
    const { userId } = req.params;
    const reviewerId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove rating
    user.ratings = user.ratings.filter(
      r => r.user.toString() !== reviewerId.toString()
    );

    // Recalculate average rating
    user.calculateAverageRating();
    await user.save();

    res.json({ message: 'Rating deleted successfully' });
  } catch (error) {
    console.error('Delete user rating error:', error);
    res.status(500).json({ message: 'Error deleting rating' });
  }
};

// Get product ratings
const getProductRatings = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const product = await Product.findById(productId)
      .populate('ratings.user', 'name')
      .select('ratings averageRating totalRatings');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Paginate ratings
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedRatings = product.ratings.slice(startIndex, endIndex);

    res.json({
      ratings: paginatedRatings,
      averageRating: product.averageRating,
      totalRatings: product.ratings.length,
      page: Number(page),
      totalPages: Math.ceil(product.ratings.length / limit)
    });
  } catch (error) {
    console.error('Get product ratings error:', error);
    res.status(500).json({ message: 'Error fetching ratings' });
  }
};

// Get user ratings
const getUserRatings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const user = await User.findById(userId)
      .populate('ratings.user', 'name')
      .select('ratings averageRating');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Paginate ratings
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedRatings = user.ratings.slice(startIndex, endIndex);

    res.json({
      ratings: paginatedRatings,
      averageRating: user.averageRating,
      totalRatings: user.ratings.length,
      page: Number(page),
      totalPages: Math.ceil(user.ratings.length / limit)
    });
  } catch (error) {
    console.error('Get user ratings error:', error);
    res.status(500).json({ message: 'Error fetching ratings' });
  }
};

module.exports = {
  addProductRating,
  updateProductRating,
  deleteProductRating,
  addUserRating,
  updateUserRating,
  deleteUserRating,
  getProductRatings,
  getUserRatings
}; 
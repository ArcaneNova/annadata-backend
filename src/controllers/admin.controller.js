const User = require('../models/user.model');
const Order = require('../models/order.model');
const Product = require('../models/product.model');

// User Management
const getAllUsers = async (req, res) => {
  try {
    const { role, status, page = 1, limit = 10 } = req.query;

    // Build query
    const query = {};
    if (role) query.role = role;
    if (status === 'verified') query.isVerified = true;
    if (status === 'unverified') query.isVerified = false;

    // Count total users
    const total = await User.countDocuments(query);

    // Get paginated users
    const users = await User.find(query)
      .select('-password -verificationToken -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      users,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isVerified, isActive } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (typeof isVerified === 'boolean') {
      user.isVerified = isVerified;
    }

    if (typeof isActive === 'boolean') {
      user.isActive = isActive;
    }

    await user.save();

    res.json({
      message: 'User status updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Error updating user status' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user's products
    await Product.deleteMany({ seller: userId });

    // Update orders
    await Order.updateMany(
      { $or: [{ buyer: userId }, { seller: userId }] },
      { $set: { status: 'cancelled', cancellationReason: 'User account deleted' } }
    );

    await user.deleteOne();

    res.json({ message: 'User and associated data deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
};

// Sales Analytics
const getSalesAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const matchStage = {
      status: 'delivered',
      paymentStatus: 'completed'
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const groupStages = {
      day: {
        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
      },
      week: {
        $dateToString: { format: '%Y-W%V', date: '$createdAt' }
      },
      month: {
        $dateToString: { format: '%Y-%m', date: '$createdAt' }
      }
    };

    const analytics = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupStages[groupBy],
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      analytics,
      summary: {
        totalOrders: analytics.reduce((sum, item) => sum + item.totalOrders, 0),
        totalRevenue: analytics.reduce((sum, item) => sum + item.totalRevenue, 0),
        averageOrderValue: analytics.reduce((sum, item) => sum + item.averageOrderValue, 0) / analytics.length
      }
    });
  } catch (error) {
    console.error('Get sales analytics error:', error);
    res.status(500).json({ message: 'Error fetching sales analytics' });
  }
};

// Revenue Reports
const getRevenueReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = {
      status: 'delivered',
      paymentStatus: 'completed'
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const reports = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$seller',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'seller'
        }
      },
      { $unwind: '$seller' },
      {
        $project: {
          seller: {
            _id: '$seller._id',
            name: '$seller.name',
            role: '$seller.role'
          },
          totalOrders: 1,
          totalRevenue: 1,
          averageOrderValue: 1
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    res.json({
      reports,
      summary: {
        totalSellers: reports.length,
        totalRevenue: reports.reduce((sum, item) => sum + item.totalRevenue, 0),
        averageRevenuePerSeller: reports.reduce((sum, item) => sum + item.totalRevenue, 0) / reports.length
      }
    });
  } catch (error) {
    console.error('Get revenue reports error:', error);
    res.status(500).json({ message: 'Error fetching revenue reports' });
  }
};

module.exports = {
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getSalesAnalytics,
  getRevenueReports
}; 
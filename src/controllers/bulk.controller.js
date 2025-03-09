const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const { sendOrderConfirmationEmail } = require('../utils/email.util');
const { calculateOrderPoints } = require('./rewards.controller');

// Create bulk order
const createBulkOrder = async (req, res) => {
  try {
    const { items, deliveryAddress, paymentMethod, deliveryDate } = req.body;
    const buyer = req.user._id;

    // Group items by seller
    const itemsBySeller = {};
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.product} not found` });
      }

      // Check stock availability
      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
        });
      }

      const sellerId = product.seller.toString();
      if (!itemsBySeller[sellerId]) {
        itemsBySeller[sellerId] = [];
      }
      itemsBySeller[sellerId].push({
        product: product._id,
        quantity: item.quantity,
        price: product.calculateFinalPrice(),
        unit: product.unit
      });
    }

    // Create orders for each seller
    const orders = [];
    const orderIds = [];
    for (const [sellerId, sellerItems] of Object.entries(itemsBySeller)) {
      const totalAmount = sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Create order
      const order = new Order({
        buyer,
        seller: sellerId,
        items: sellerItems,
        totalAmount,
        paymentMethod,
        deliveryAddress,
        orderType: 'bulk',
        expectedDeliveryDate: deliveryDate,
        status: 'pending'
      });

      await order.save();
      orders.push(order);
      orderIds.push(order._id);

      // Update product stock
      for (const item of sellerItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity }
        });
      }

      // Send order confirmation email
      await sendOrderConfirmationEmail(req.user.email, order);

      // Emit socket event
      req.app.get('io').emit('newBulkOrder', {
        orderId: order._id,
        seller: sellerId,
        isBulk: true
      });
    }

    res.status(201).json({
      message: 'Bulk orders created successfully',
      orders,
      orderIds
    });
  } catch (error) {
    console.error('Create bulk order error:', error);
    res.status(500).json({ message: 'Error creating bulk orders' });
  }
};

// Get bulk orders
const getBulkOrders = async (req, res) => {
  try {
    const {
      role,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;
    const user = req.user._id;

    // Build query
    const query = { orderType: 'bulk' };
    if (role === 'buyer') {
      query.buyer = user;
    } else if (role === 'seller') {
      query.seller = user;
    }

    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Count total documents
    const total = await Order.countDocuments(query);

    // Execute query with pagination
    const orders = await Order.find(query)
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone')
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      orders,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('Get bulk orders error:', error);
    res.status(500).json({ message: 'Error fetching bulk orders' });
  }
};

// Update bulk order status
const updateBulkOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const seller = req.user._id;

    const order = await Order.findOne({
      _id: id,
      seller,
      orderType: 'bulk'
    });

    if (!order) {
      return res.status(404).json({ message: 'Bulk order not found' });
    }

    // Validate status transition
    const validTransitions = {
      pending: ['accepted', 'rejected'],
      accepted: ['processing'],
      processing: ['ready-for-delivery'],
      'ready-for-delivery': ['in-transit'],
      'in-transit': ['delivered'],
      delivered: []
    };

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({ message: 'Invalid status transition' });
    }

    order.status = status;
    if (status === 'delivered') {
      order.actualDeliveryDate = new Date();
      
      // Calculate and award loyalty points
      const pointsEarned = await calculateOrderPoints(order._id);
      
      // Add points info to response
      res.locals.pointsEarned = pointsEarned;
    }

    await order.save();

    // Emit socket event
    req.app.get('io').emit('bulkOrderStatusUpdate', {
      orderId: order._id,
      status,
      buyer: order.buyer,
      pointsEarned: res.locals.pointsEarned
    });

    res.json({
      message: 'Bulk order status updated successfully',
      order,
      pointsEarned: res.locals.pointsEarned
    });
  } catch (error) {
    console.error('Update bulk order status error:', error);
    res.status(500).json({ message: 'Error updating bulk order status' });
  }
};

// Get bulk order analytics
const getBulkOrderAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const user = req.user;

    const query = {
      orderType: 'bulk',
      status: 'delivered'
    };

    if (user.role !== 'admin') {
      query[user.role === 'consumer' ? 'buyer' : 'seller'] = user._id;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const analytics = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalOrders: { $sum: 1 },
          totalQuantity: {
            $sum: {
              $reduce: {
                input: '$items',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.quantity'] }
              }
            }
          },
          totalAmount: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    res.json({
      analytics,
      summary: {
        totalOrders: analytics.reduce((sum, item) => sum + item.totalOrders, 0),
        totalQuantity: analytics.reduce((sum, item) => sum + item.totalQuantity, 0),
        totalAmount: analytics.reduce((sum, item) => sum + item.totalAmount, 0),
        averageOrderValue: analytics.reduce((sum, item) => sum + item.averageOrderValue, 0) / analytics.length
      }
    });
  } catch (error) {
    console.error('Get bulk order analytics error:', error);
    res.status(500).json({ message: 'Error fetching bulk order analytics' });
  }
};

// Create bulk purchase from farmer (vendor only)
const createFarmerPurchase = async (req, res) => {
  try {
    const { farmerId, items, deliveryAddress, deliveryDate } = req.body;
    const buyer = req.user._id;

    // Verify that the buyer is a vendor
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Only vendors can create farmer purchases' });
    }

    // Verify that the seller is a farmer
    const farmer = await User.findById(farmerId);
    if (!farmer || farmer.role !== 'farmer') {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required' });
    }

    // Process items
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const { productId, quantity } = item;
      
      // Validate product
      const product = await Product.findOne({ 
        _id: productId,
        seller: farmerId,
        sellerType: 'farmer'
      });
      
      if (!product) {
        return res.status(404).json({ message: `Product ${productId} not found or not sold by this farmer` });
      }

      // Check stock availability
      if (product.stock < quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
        });
      }

      // Add to order items
      orderItems.push({
        product: product._id,
        quantity,
        price: product.price,
        unit: product.unit
      });

      // Add to total amount
      totalAmount += product.price * quantity;

      // Update product stock
      await Product.findByIdAndUpdate(productId, {
        $inc: { stock: -quantity }
      });
    }

    // Create order
    const order = new Order({
      buyer,
      seller: farmerId,
      items: orderItems,
      totalAmount,
      paymentMethod: 'direct',
      deliveryAddress,
      orderType: 'farmer-vendor',
      expectedDeliveryDate: deliveryDate,
      status: 'pending'
    });

    await order.save();

    // Emit socket event
    req.app.get('io')?.emit('newFarmerOrder', {
      orderId: order._id,
      seller: farmerId,
      isBulk: true
    });

    res.status(201).json({
      message: 'Farmer purchase order created successfully',
      order
    });
  } catch (error) {
    console.error('Create farmer purchase error:', error);
    res.status(500).json({ message: 'Error creating farmer purchase order' });
  }
};

module.exports = {
  createBulkOrder,
  getBulkOrders,
  updateBulkOrderStatus,
  getBulkOrderAnalytics,
  createFarmerPurchase
}; 
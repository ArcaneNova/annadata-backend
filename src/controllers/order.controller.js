const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const { sendOrderConfirmationEmail } = require('../utils/email.util');
const { calculateOrderPoints } = require('./rewards.controller');
const Counter = require('../models/counter.model');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Function to get the next order number
async function getNextOrderNumber() {
  try {
    const counter = await Counter.findByIdAndUpdate(
      'orderNumber',
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return `ORD${counter.seq.toString().padStart(6, '0')}`;
  } catch (error) {
    console.error('Error generating order number:', error);
    throw new Error('Failed to generate order number');
  }
}

// Create a new order
const createOrder = async (req, res) => {
  try {
    const { products, shippingAddress, paymentMethod = 'cod', orderType = 'vendor-to-consumer' } = req.body;
    const buyer = req.user._id;
    const buyerName = req.user.name || 'Anonymous';
    
    console.log(`Order creation requested by user ${buyer} (${buyerName}):`, {
      productCount: products?.length,
      paymentMethod,
      orderType
    });

    // Validate products array
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Invalid products data. Please provide a valid array of products.' });
    }

    // Validate shipping address
    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || 
        !shippingAddress.state || !shippingAddress.pincode) {
      return res.status(400).json({ message: 'Invalid shipping address. All address fields are required.' });
    }

    // Enhanced shipping address with customer details if not already present
    const enhancedShippingAddress = {
      ...shippingAddress,
      customerName: shippingAddress.customerName || buyerName,
      customerEmail: shippingAddress.customerEmail || req.user.email || 'No email provided'
    };

    // Group products by seller
    const productsBySeller = {};
    
    // First pass: Validate products and group by seller
    for (const item of products) {
      try {
        // Validate product ID
        if (!item.productId) {
          return res.status(400).json({ message: 'Product ID is required for each item' });
        }

        // Validate quantity
        if (!item.quantity || item.quantity <= 0) {
          return res.status(400).json({ 
            message: `Invalid quantity for product ${item.productId}. Quantity must be greater than 0.`
          });
        }

        const product = await Product.findById(item.productId).populate('seller');
        if (!product) {
          return res.status(404).json({ 
            message: `Product ${item.productId} not found` 
          });
        }

        // Check stock availability
        if (product.stock < item.quantity) {
          return res.status(400).json({ 
            message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
          });
        }

        const sellerId = product.seller._id.toString();
        if (!productsBySeller[sellerId]) {
          productsBySeller[sellerId] = {
            seller: product.seller._id,
            items: [],
            totalAmount: 0
          };
        }

        const price = typeof product.calculateFinalPrice === 'function' 
          ? product.calculateFinalPrice() 
          : product.price;

        productsBySeller[sellerId].items.push({
          product: product._id,
          quantity: item.quantity,
          price,
          unit: product.unit || 'piece'
        });
        productsBySeller[sellerId].totalAmount += price * item.quantity;
      } catch (error) {
        console.error('Product processing error:', error);
        return res.status(500).json({ 
          message: `Error processing product ${item.productId}: ${error.message}` 
        });
      }
    }

    if (Object.keys(productsBySeller).length === 0) {
      return res.status(400).json({ message: 'No valid products found to create an order' });
    }

    // Create an order for each seller
    const orders = [];
    let stockUpdated = [];
    let failedStockUpdates = [];
    
    try {
      for (const [sellerId, sellerData] of Object.entries(productsBySeller)) {
        // Generate order number first
        const orderNumber = await getNextOrderNumber();
        if (!orderNumber) {
          throw new Error('Failed to generate order number');
        }

        let razorpayOrderId;
        if (paymentMethod === 'razorpay') {
          try {
            // Create Razorpay order
            const razorpayOrder = await razorpay.orders.create({
              amount: sellerData.totalAmount * 100, // Convert to paise
              currency: 'INR',
              receipt: orderNumber,
              notes: {
                orderNumber: orderNumber,
                buyerId: buyer.toString(),
                sellerId: sellerId
              }
            });
            razorpayOrderId = razorpayOrder.id;
            console.log(`Razorpay order created: ${razorpayOrderId} for order ${orderNumber}`);
          } catch (razorpayError) {
            console.error('Razorpay order creation error:', razorpayError);
            throw new Error(`Failed to create Razorpay order: ${razorpayError.message}`);
          }
        }

        // Create and save the order
        const order = new Order({
          orderNumber,
          buyer,
          seller: sellerData.seller,
          items: sellerData.items,
          totalAmount: sellerData.totalAmount,
          paymentMethod,
          deliveryAddress: enhancedShippingAddress,
          status: 'pending',
          orderType,
          razorpayOrderId
        });

        // Save the order
        const savedOrder = await order.save();
        console.log(`Order ${orderNumber} saved successfully for buyer ${buyerName}`);
        
        // Populate the order details for response
        await savedOrder.populate(['buyer', 'seller', 'items.product']);
        orders.push(savedOrder);

        // Try to send real-time notification to vendor
        try {
          if (req.app && req.app.get('io')) {
            const io = req.app.get('io');
            // Emit to specific vendor room if they're online
            io.to(`vendor-${sellerData.seller}`).emit('order:new', {
              orderId: savedOrder._id,
              orderNumber: savedOrder.orderNumber,
              totalAmount: savedOrder.totalAmount,
              customerName: enhancedShippingAddress.customerName,
              itemCount: savedOrder.items.length,
              status: 'pending'
            });
            console.log(`Notification sent to vendor ${sellerData.seller} via socket`);
          }
        } catch (notificationError) {
          console.error('Failed to send vendor notification:', notificationError);
          // Don't fail the order if notification fails
        }

        // Update product stock
        for (const item of sellerData.items) {
          try {
            await Product.findByIdAndUpdate(item.product, {
              $inc: { stock: -item.quantity }
            });
            stockUpdated.push({
              productId: item.product,
              quantity: item.quantity
            });
          } catch (stockError) {
            console.error(`Error updating stock for product ${item.product}:`, stockError);
            failedStockUpdates.push({
              productId: item.product,
              quantity: item.quantity,
              error: stockError.message
            });
          }
        }
      }

      // Track failed stock updates but don't fail the order
      if (failedStockUpdates.length > 0) {
        console.warn('Some stock updates failed:', failedStockUpdates);
      }

      // Send order confirmation email
      if (req.user.email) {
        for (const order of orders) {
          try {
            await sendOrderConfirmationEmail(req.user.email, order);
          } catch (emailError) {
            console.error('Email sending error:', emailError);
            // Don't fail the order creation if email fails
          }
        }
      }

      console.log(`Order creation completed successfully for user ${buyer}`);
      res.status(201).json({
        message: 'Order(s) created successfully',
        order: orders[0]
      });
    } catch (error) {
      console.error('Order creation failed, rolling back stock updates:', error);
      
      // Rollback stock updates if order creation fails
      for (const update of stockUpdated) {
        try {
          await Product.findByIdAndUpdate(update.productId, {
            $inc: { stock: update.quantity }
          });
          console.log(`Rolled back stock update for product ${update.productId}`);
        } catch (rollbackError) {
          console.error(`Failed to rollback stock for product ${update.productId}:`, rollbackError);
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ 
      message: `Error creating order: ${error.message}`,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Verify Razorpay payment
const verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId: razorpayPaymentId, signature: razorpaySignature } = req.body;
    console.log('Payment verification request:', { orderId, razorpayPaymentId, razorpaySignature });

    // Validate required fields
    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }
    if (!razorpayPaymentId) {
      return res.status(400).json({ message: 'Payment ID is required' });
    }
    if (!razorpaySignature) {
      return res.status(400).json({ message: 'Payment signature is required' });
    }

    // Find the order
    const order = await Order.findById(orderId).populate('buyer seller');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('Found order:', { 
      id: order._id, 
      razorpayOrderId: order.razorpayOrderId,
      buyer: order.buyer?._id,
      requestUser: req.user?._id,
      currentStatus: order.status,
      paymentStatus: order.paymentStatus,
      existingPaymentId: order.razorpayPaymentId
    });

    // Verify that the order belongs to the current user
    if (order.buyer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to verify this payment' });
    }

    // Check if payment is already verified
    if (order.paymentStatus === 'completed' && order.razorpayPaymentId) {
      console.log(`Payment already verified for order: ${order._id}, razorpayPaymentId: ${order.razorpayPaymentId}`);

      // If this is the same payment ID, return success
      if (order.razorpayPaymentId === razorpayPaymentId) {
        return res.json({ 
          message: 'Payment already verified',
          order,
          alreadyVerified: true
        });
      } else {
        // If different payment ID, reject the verification
        return res.status(400).json({ 
          message: 'Order already has a verified payment with a different payment ID',
          details: 'This may indicate a duplicate payment attempt'
        });
      }
    }

    // For COD orders
    if (razorpayPaymentId === 'COD' && razorpaySignature === 'COD') {
      // Update order status for COD
      order.paymentStatus = 'completed';
      order.status = 'accepted';
      await order.save();

      return res.json({ 
        message: 'Payment verified successfully',
        order 
      });
    }

    // Verify razorpayOrderId exists
    if (!order.razorpayOrderId) {
      return res.status(400).json({ 
        message: 'Razorpay order ID not found on this order',
        details: 'The order might not have been created with Razorpay payment method'
      });
    }

    // For online payments (Razorpay)
    try {
      // Generate signature verification string
      const text = `${order.razorpayOrderId}|${razorpayPaymentId}`;
      console.log('Signature verification string:', text);
      
      // Generate signature
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(text)
        .digest('hex');

      console.log('Signature comparison:', { 
        generated: generatedSignature, 
        received: razorpaySignature 
      });

      // Verify signature
      const isSignatureValid = generatedSignature === razorpaySignature;

      if (!isSignatureValid) {
        return res.status(400).json({ 
          message: 'Invalid payment signature',
          details: 'Payment verification failed - signature mismatch'
        });
      }

      // Update order status
      order.paymentStatus = 'completed';
      order.status = 'accepted';
      order.razorpayPaymentId = razorpayPaymentId;
      order.razorpaySignature = razorpaySignature;
      await order.save();

      console.log('Payment verified successfully for order:', order._id);

      res.json({ 
        message: 'Payment verified successfully',
        order 
      });
    } catch (error) {
      console.error('Payment signature verification error:', error);
      return res.status(400).json({ 
        message: 'Payment verification failed',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ 
      message: `Error verifying payment: ${error.message}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const seller = req.user._id;

    console.log(`Updating order ${id} status to ${status} by seller ${seller}`);

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    // Find the order
    const order = await Order.findOne({ _id: id, seller });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log(`Found order ${id}, current status: ${order.status}`);

    // Validate status transition
    const validTransitions = {
      pending: ['accepted', 'rejected', 'cancelled'],
      accepted: ['in-transit', 'cancelled'],
      'in-transit': ['delivered', 'cancelled'],
      delivered: [],
      cancelled: [],
      rejected: []
    };

    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status transition',
        currentStatus: order.status,
        requestedStatus: status,
        validTransitions: validTransitions[order.status]
      });
    }

    // Update the order status
    order.status = status;
    
    // If order is cancelled, record the date
    if (status === 'cancelled') {
      order.cancellationReason = req.body.reason || 'Cancelled by vendor';
    }
    
    // If order is delivered, record the delivery date
    if (status === 'delivered') {
      order.actualDeliveryDate = new Date();
    }
    
    await order.save();
    console.log(`Order ${id} status updated to ${status}`);

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ 
      message: 'Error updating order status',
      error: error.message
    });
  }
};

// Cancel order
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user._id;

    const order = await Order.findOne({
      _id: id,
      $or: [{ buyer: user }, { seller: user }]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!['pending', 'accepted'].includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }

    // Update order status
    order.status = 'cancelled';
    order.cancellationReason = reason;
    await order.save();

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }

    // Process refund if payment was made
    if (order.paymentStatus === 'completed') {
      const refund = await razorpay.payments.refund(order.razorpayPaymentId);
      order.refundStatus = 'processed';
      order.refundId = refund.id;
      await order.save();
    }

    // Emit socket event for real-time updates
    req.app.get('io').emit('orderCancelled', {
      orderId: order._id,
      buyer: order.buyer,
      seller: order.seller
    });

    res.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Error cancelling order' });
  }
};

// Get vendor orders
const getVendorOrders = async (req, res) => {
  try {
    const {
      status,
      date,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 10
    } = req.query;
    
    const vendor = req.user._id;
    console.log(`Fetching orders for vendor: ${vendor}`);

    // Build query - vendor is always the seller
    const query = { seller: vendor };
    
    // Add optional filters
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (date && date !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (date) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case '3months':
          startDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }
    
    console.log('Vendor order query:', JSON.stringify(query));
    
    // Build sort configuration
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;
    
    // Count total documents
    const total = await Order.countDocuments(query);
    
    // Parse pagination parameters
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    
    // Execute query with pagination
    const orders = await Order.find(query)
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate('items.product', 'name price images')
      .sort(sortOptions)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
    
    // Transform orders to include customer info from delivery address
    const transformedOrders = orders.map(order => {
      // Convert to plain object
      const orderObj = order.toObject();
      
      // Add consumer info from buyer or delivery address
      orderObj.consumer = {
        _id: orderObj.buyer?._id || 'unknown',
        name: orderObj.deliveryAddress?.customerName || orderObj.buyer?.name || 'Anonymous',
        email: orderObj.deliveryAddress?.customerEmail || orderObj.buyer?.email || 'No email provided'
      };
      
      // Make sure items have price info
      orderObj.items = orderObj.items.map(item => {
        if (!item.price && item.product && item.product.price) {
          item.price = item.product.price;
        }
        return item;
      });
      
      return orderObj;
    });
    
    console.log(`Found ${transformedOrders.length} orders for vendor ${vendor}`);
    
    res.json({
      orders: transformedOrders,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      total
    });
  } catch (error) {
    console.error('Get vendor orders error:', error);
    res.status(500).json({ 
      message: 'Error fetching vendor orders',
      error: error.message
    });
  }
};

// Get orders
const getOrders = async (req, res) => {
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
    const query = {};
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
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

// Get single order
const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user._id;

    const order = await Order.findOne({
      _id: id,
      $or: [{ buyer: user }, { seller: user }]
    })
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate('items.product', 'name price description images');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Transform order to include consumer info
    const transformedOrder = order.toObject();
    
    // Add consumer info
    transformedOrder.consumer = {
      _id: transformedOrder.buyer?._id || 'unknown',
      name: transformedOrder.deliveryAddress?.customerName || transformedOrder.buyer?.name || 'Anonymous',
      email: transformedOrder.deliveryAddress?.customerEmail || transformedOrder.buyer?.email || 'No email provided'
    };
    
    // Ensure items have price
    transformedOrder.items = transformedOrder.items.map(item => {
      if (!item.price && item.product && item.product.price) {
        item.price = item.product.price;
      }
      return item;
    });

    res.json(transformedOrder);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Error fetching order' });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  updateOrderStatus,
  cancelOrder,
  getVendorOrders,
  getOrders,
  getOrder
}; 
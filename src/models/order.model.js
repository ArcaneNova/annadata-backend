const mongoose = require('mongoose');
const Counter = require('./counter.model');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'in-transit', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'cod'],
    required: true
  },
  razorpayOrderId: {
    type: String,
    sparse: true // Allow null/undefined but ensure uniqueness when present
  },
  razorpayPaymentId: String,
  razorpaySignature: String,
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    customerName: String,
    customerEmail: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    }
  },
  orderType: {
    type: String,
    enum: ['farmer-to-vendor', 'vendor-to-consumer'],
    required: true
  },
  expectedDeliveryDate: Date,
  actualDeliveryDate: Date,
  cancellationReason: String,
  refundStatus: {
    type: String,
    enum: ['not-applicable', 'pending', 'processed', 'failed'],
    default: 'not-applicable'
  },
  refundId: String,
  rating: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    createdAt: Date
  }
}, {
  timestamps: true
});

// Function to get the next order number
async function getNextOrderNumber() {
  try {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'orderNumber' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return `ORD${counter.seq.toString().padStart(6, '0')}`;
  } catch (error) {
    console.error('Error generating order number:', error);
    throw new Error('Failed to generate order number');
  }
}

// Pre-save middleware to set order number
orderSchema.pre('save', async function(next) {
  try {
    if (!this.orderNumber) {
      const orderNumber = await getNextOrderNumber();
      if (!orderNumber) {
        throw new Error('Failed to generate order number');
      }
      this.orderNumber = orderNumber;
    }

    if (this.isModified('items')) {
      this.totalAmount = this.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Index for geospatial queries
orderSchema.index({ "deliveryAddress.coordinates": "2dsphere" });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order; 
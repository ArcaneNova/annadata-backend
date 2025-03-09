const Product = require('../models/product.model');
const User = require('../models/user.model');

// Constants for alert thresholds
const LOW_STOCK_THRESHOLD = 10;
const CRITICAL_STOCK_THRESHOLD = 5;

// Set alert thresholds for a product
const setAlertThresholds = async (req, res) => {
  try {
    const { productId } = req.params;
    const { lowStock, criticalStock } = req.body;
    const seller = req.user._id;

    const product = await Product.findOne({ _id: productId, seller });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update thresholds
    product.stockAlerts = {
      lowStock: lowStock || LOW_STOCK_THRESHOLD,
      criticalStock: criticalStock || CRITICAL_STOCK_THRESHOLD
    };
    await product.save();

    res.json({
      message: 'Alert thresholds updated successfully',
      product: {
        _id: product._id,
        name: product.name,
        stock: product.stock,
        stockAlerts: product.stockAlerts
      }
    });
  } catch (error) {
    console.error('Set alert thresholds error:', error);
    res.status(500).json({ message: 'Error setting alert thresholds' });
  }
};

// Get inventory alerts
const getInventoryAlerts = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const seller = req.user._id;

    // Build query
    const query = { seller };
    
    if (status === 'critical') {
      query.$expr = {
        $lte: ['$stock', { $ifNull: ['$stockAlerts.criticalStock', CRITICAL_STOCK_THRESHOLD] }]
      };
    } else if (status === 'low') {
      query.$expr = {
        $and: [
          { $lte: ['$stock', { $ifNull: ['$stockAlerts.lowStock', LOW_STOCK_THRESHOLD] }] },
          { $gt: ['$stock', { $ifNull: ['$stockAlerts.criticalStock', CRITICAL_STOCK_THRESHOLD] }] }
        ]
      };
    } else {
      query.$expr = {
        $lte: ['$stock', { $ifNull: ['$stockAlerts.lowStock', LOW_STOCK_THRESHOLD] }]
      };
    }

    // Count total documents
    const total = await Product.countDocuments(query);

    // Get products with low/critical stock
    const products = await Product.find(query)
      .select('name stock unit stockAlerts category images')
      .sort({ stock: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Categorize alerts
    const alerts = products.map(product => ({
      _id: product._id,
      name: product.name,
      stock: product.stock,
      unit: product.unit,
      category: product.category,
      image: product.images[0]?.url,
      thresholds: product.stockAlerts || {
        lowStock: LOW_STOCK_THRESHOLD,
        criticalStock: CRITICAL_STOCK_THRESHOLD
      },
      status: product.stock <= (product.stockAlerts?.criticalStock || CRITICAL_STOCK_THRESHOLD)
        ? 'critical'
        : 'low'
    }));

    res.json({
      alerts,
      summary: {
        total,
        critical: alerts.filter(a => a.status === 'critical').length,
        low: alerts.filter(a => a.status === 'low').length
      },
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get inventory alerts error:', error);
    res.status(500).json({ message: 'Error fetching inventory alerts' });
  }
};

// Check inventory levels and send alerts
const checkInventoryLevels = async (productId) => {
  try {
    const product = await Product.findById(productId)
      .populate('seller', 'email');

    if (!product) return;

    const thresholds = product.stockAlerts || {
      lowStock: LOW_STOCK_THRESHOLD,
      criticalStock: CRITICAL_STOCK_THRESHOLD
    };

    let alertType = null;
    if (product.stock <= thresholds.criticalStock) {
      alertType = 'critical';
    } else if (product.stock <= thresholds.lowStock) {
      alertType = 'low';
    }

    if (alertType) {
      // Emit socket event
      const io = require('../server').io;
      io.to(product.seller._id.toString()).emit('inventoryAlert', {
        productId: product._id,
        name: product.name,
        stock: product.stock,
        type: alertType
      });
    }

    return alertType;
  } catch (error) {
    console.error('Check inventory levels error:', error);
    return null;
  }
};

// Enable/disable alerts for a product
const toggleAlerts = async (req, res) => {
  try {
    const { productId } = req.params;
    const { enabled } = req.body;
    const seller = req.user._id;

    const product = await Product.findOne({ _id: productId, seller });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.alertsEnabled = enabled;
    await product.save();

    res.json({
      message: `Inventory alerts ${enabled ? 'enabled' : 'disabled'} successfully`,
      product: {
        _id: product._id,
        name: product.name,
        alertsEnabled: product.alertsEnabled
      }
    });
  } catch (error) {
    console.error('Toggle alerts error:', error);
    res.status(500).json({ message: 'Error toggling alerts' });
  }
};

// Get alert settings
const getAlertSettings = async (req, res) => {
  try {
    const { productId } = req.params;
    const seller = req.user._id;

    const product = await Product.findOne({ _id: productId, seller })
      .select('name stock unit stockAlerts alertsEnabled');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      product: {
        _id: product._id,
        name: product.name,
        stock: product.stock,
        unit: product.unit,
        alertsEnabled: product.alertsEnabled,
        thresholds: product.stockAlerts || {
          lowStock: LOW_STOCK_THRESHOLD,
          criticalStock: CRITICAL_STOCK_THRESHOLD
        }
      }
    });
  } catch (error) {
    console.error('Get alert settings error:', error);
    res.status(500).json({ message: 'Error fetching alert settings' });
  }
};

module.exports = {
  setAlertThresholds,
  getInventoryAlerts,
  checkInventoryLevels,
  toggleAlerts,
  getAlertSettings
}; 
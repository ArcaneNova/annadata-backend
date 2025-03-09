const Product = require('../models/product.model');
const Order = require('../models/order.model');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/upload.util');
const mongoose = require('mongoose');

// Create a new product
const createProduct = async (req, res) => {
  try {
    const { name, description, category, price, stock, unit } = req.body;
    const seller = req.user._id;
    const sellerType = req.user.role;

    // Handle image upload
    let images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file);
        images.push(result);
      }
    }

    // Create product
    const product = new Product({
      name,
      description,
      category,
      price,
      stock,
      unit,
      seller,
      sellerType,
      images,
      basePrice: sellerType === 'vendor' ? price : undefined
    });

    await product.save();

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Error creating product' });
  }
};

// Update a product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const seller = req.user._id;

    // Find product and check ownership
    const product = await Product.findOne({ _id: id, seller });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Handle image upload if new images are provided
    if (req.files && req.files.length > 0) {
      // Delete old images from Cloudinary
      for (const image of product.images) {
        await deleteFromCloudinary(image.public_id);
      }

      // Upload new images
      const images = [];
      for (const file of req.files) {
        const result = await uploadToCloudinary(file);
        images.push(result);
      }
      updates.images = images;
    }

    // Update product
    Object.assign(product, updates);
    await product.save();

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Error updating product' });
  }
};

// Delete a product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const seller = req.user._id;

    // Find product and check ownership
    const product = await Product.findOne({ _id: id, seller });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete images from Cloudinary
    for (const image of product.images) {
      await deleteFromCloudinary(image.public_id);
    }

    await product.deleteOne();

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Error deleting product' });
  }
};

// Get products for authenticated users (filtered by seller)
const getProducts = async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      search,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 10,
      role // Added role parameter to explicitly filter by role
    } = req.query;

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Build query based on user role or explicit role parameter
    let query = {};
    
    // If role parameter is provided, use it to filter
    if (role === 'farmer') {
      // Farmers can only see their own products
      query.seller = req.user._id;
      query.sellerType = 'farmer';
    } else if (role === 'vendor') {
      // Vendors can only see their own products
      query.seller = req.user._id;
      query.sellerType = 'vendor';
    } else {
      // Default behavior based on user role
      if (req.user.role === 'farmer') {
        // Farmers can only see their own products
        query.seller = req.user._id;
        query.sellerType = 'farmer';
      } else if (req.user.role === 'vendor') {
        // Vendors can only see their own products
        query.seller = req.user._id;
        query.sellerType = 'vendor';
      } else if (req.user.role === 'consumer') {
        // Consumers can only see vendor products
        query.sellerType = 'vendor';
        query.isActive = true;
      }
    }
    
    // Apply additional filters
    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) {
      query.$text = { $search: search };
    }

    console.log('Query:', query);

    // Count total documents
    const total = await Product.countDocuments(query);

    // Execute query with pagination and sorting
    const products = await Product.find(query)
      .populate('seller', 'name email phone')
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      products,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
};

// Get products for public access (no authentication required)
const getPublicProducts = async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      search,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    // Build query for public products - only show vendor products
    const query = { 
      isActive: true,
      sellerType: 'vendor' // Only show vendor products
    };
    
    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) {
      query.$text = { $search: search };
    }

    console.log('Public products query:', query);

    // Count total documents
    const total = await Product.countDocuments(query);
    console.log('Total vendor products found:', total);

    // Execute query with pagination and sorting
    const products = await Product.find(query)
      .populate('seller', 'name')
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    console.log('Vendor products returned:', products.length);
    
    // Return products array directly if no products found
    const response = {
      products: products || [],
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      total
    };

    console.log('Response:', response);
    res.json(response);
  } catch (error) {
    console.error('Get public products error:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
};

// Get a single product
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate('seller', 'name email phone averageRating')
      .populate('ratings.user', 'name');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Error fetching product' });
  }
};

// Update product margin (admin only)
const updateMargin = async (req, res) => {
  try {
    const { id } = req.params;
    const { marginPercentage } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.sellerType !== 'vendor') {
      return res.status(400).json({ message: 'Margin can only be set for vendor products' });
    }

    product.marginPercentage = marginPercentage;
    await product.save();

    res.json({
      message: 'Product margin updated successfully',
      product
    });
  } catch (error) {
    console.error('Update margin error:', error);
    res.status(500).json({ message: 'Error updating product margin' });
  }
};

// Get farmer products for vendor marketplace
const getFarmerProducts = async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      search,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    // Build query for farmer products
    const query = {
      sellerType: 'farmer',
      isActive: true
    };
    
    // Apply additional filters
    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) {
      query.$text = { $search: search };
    }

    console.log('Farmer products query:', query);

    // Count total documents
    const total = await Product.countDocuments(query);

    // Execute query with pagination and sorting
    const products = await Product.find(query)
      .populate('seller', 'name farmName farmLocation')
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    console.log(`Found ${products.length} farmer products`);

    res.json({
      products,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('Get farmer products error:', error);
    res.status(500).json({ message: 'Error fetching farmer products' });
  }
};

// Get vendor products
const getVendorProducts = async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    const products = await Product.find({
      seller: vendorId,
      isActive: true
    })
    .populate('seller', 'name businessName businessType businessLocation averageRating')
    .sort('-createdAt');

    res.json(products);
  } catch (error) {
    console.error('Get vendor products error:', error);
    res.status(500).json({ message: 'Error fetching vendor products' });
  }
};

// Get vendor's own products
const getVendorOwnProducts = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const products = await Product.find({ 
      seller: vendorId,
      sellerType: 'vendor'
    })
    .select('name description category price stock unit images ratings averageRating totalRatings createdAt')
    .sort('-createdAt');

    res.json(products);
  } catch (error) {
    console.error('Get vendor products error:', error);
    res.status(500).json({ message: 'Error fetching vendor products' });
  }
};

// Get vendor product analytics
const getVendorProductAnalytics = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { productId, timeRange = '30' } = req.query; // timeRange in days
    
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const matchQuery = {
      seller: new mongoose.Types.ObjectId(vendorId),
      sellerType: 'vendor'
    };

    if (productId) {
      matchQuery._id = new mongoose.Types.ObjectId(productId);
    }

    const analytics = await Product.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'orders',
          let: { productId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$seller', new mongoose.Types.ObjectId(vendorId)] },
                    { $gte: ['$createdAt', startDate] },
                    { $lte: ['$createdAt', endDate] },
                    { $in: ['$status', ['delivered', 'in-transit']] }
                  ]
                }
              }
            },
            { $unwind: '$items' },
            {
              $match: {
                $expr: { $eq: ['$items.product', '$$productId'] }
              }
            },
            {
              $project: {
                quantity: '$items.quantity',
                price: '$items.price',
                createdAt: 1,
                dateString: { 
                  $dateToString: { 
                    format: '%Y-%m-%d', 
                    date: '$createdAt' 
                  } 
                }
              }
            },
            {
              $group: {
                _id: '$dateString',
                dailyQuantity: { $sum: '$quantity' },
                dailyRevenue: { $sum: { $multiply: ['$price', '$quantity'] } }
              }
            },
            { $sort: { _id: 1 } }
          ],
          as: 'dailyStats'
        }
      },
      {
        $project: {
          name: 1,
          category: 1,
          stock: 1,
          price: 1,
          averageRating: 1,
          totalRatings: 1,
          totalSales: {
            $reduce: {
              input: '$dailyStats',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.dailyQuantity'] }
            }
          },
          revenue: {
            $reduce: {
              input: '$dailyStats',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.dailyRevenue'] }
            }
          },
          totalQuantitySold: {
            $reduce: {
              input: '$dailyStats',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.dailyQuantity'] }
            }
          },
          dailySales: {
            $map: {
              input: '$dailyStats',
              as: 'day',
              in: {
                date: '$$day._id',
                sales: '$$day.dailyQuantity',
                revenue: '$$day.dailyRevenue'
              }
            }
          }
        }
      }
    ]);

    // Fill in missing dates with zero values
    const filledAnalytics = analytics.map(product => {
      const salesByDate = new Map(product.dailySales.map(day => [day.date, day]));
      const filledDailySales = [];
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        filledDailySales.push(salesByDate.get(dateStr) || {
          date: dateStr,
          sales: 0,
          revenue: 0
        });
      }
      
      return {
        ...product,
        dailySales: filledDailySales
      };
    });

    console.log('Vendor analytics result:', filledAnalytics);
    res.json(filledAnalytics);
  } catch (error) {
    console.error('Get vendor product analytics error:', error);
    res.status(500).json({ message: 'Error fetching product analytics' });
  }
};

module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getPublicProducts,
  getProduct,
  updateMargin,
  getFarmerProducts,
  getVendorProducts,
  getVendorOwnProducts,
  getVendorProductAnalytics
}; 
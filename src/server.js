require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/user.model');
const { authenticateSocket } = require('./middleware/auth.middleware');

// Import routes
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const locationRoutes = require('./routes/location.routes');
const ratingRoutes = require('./routes/rating.routes');
const adminRoutes = require('./routes/admin.routes');
const rewardsRoutes = require('./routes/rewards.routes');
const supportRoutes = require('./routes/support.routes');
const bulkRoutes = require('./routes/bulk.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const exportRoutes = require('./routes/export.routes');
const soilRoutes = require('./routes/soil.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();
const server = http.createServer(app);

// Simple CORS configuration
app.use(cors({
  origin: 'https://annadata-client.vercel.app',
  credentials: true
}));

// Parse JSON request bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: '*',
    credentials: true
  },
  path: '/socket.io',
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e8,
  transports: ['websocket', 'polling']
});

// Store active locations in memory
const activeVendors = new Map();
const activeConsumers = new Map();
const socketToUser = new Map();

// Add debug logging for MongoDB queries
const debug = require('debug')('app:socket');

// Debug middleware for connection attempts
io.engine.on("connection_error", (err) => {
  console.log('Connection error details:', {
    req: err.req,
    code: err.code,
    message: err.message,
    context: err.context
  });
});

// Socket.IO middleware for authentication
io.use(async (socket, next) => {
  try {
    console.log('Socket connection attempt:', {
      query: socket.handshake.query,
      auth: socket.handshake.auth ? 'present' : 'missing'
    });

    // Allow public access for viewing vendors
    if (!socket.handshake.auth?.token) {
      console.log('Public access granted');
      socket.isPublic = true;
      return next();
    }

    // Authenticate if token is provided
    const token = socket.handshake.auth.token;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        console.log('User not found for ID:', decoded.userId);
        return next(new Error('User not found'));
      }

      socket.user = user;
      socketToUser.set(socket.id, user._id.toString());
      console.log('User authenticated successfully:', user._id);
      return next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return next(new Error('Invalid authentication token'));
    }
  } catch (error) {
    console.error('Socket authentication error:', error);
    return next(new Error('Authentication failed'));
  }
});

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log('New client connected:', socket.id, socket.isPublic ? '(public)' : `(user: ${socket.user?._id})`);

  // Handle get nearby vendors request
  socket.on('get:nearby:vendors', async (data) => {
    try {
      console.log('Received nearby vendors request:', data);
      const { lat, lng, radius = 5000 } = data; // radius in meters

      if (!lat || !lng) {
        throw new Error('Invalid coordinates provided');
      }

      // Log the query we're about to make
      debug('Querying vendors with params:', {
        lat,
        lng,
        radius,
        coordinates: [lng, lat]
      });

      // Query verified vendors from database within radius
      const query = {
        role: 'vendor',
        isVerified: true,
        'businessLocation.type': 'Point',
        'businessLocation.coordinates': {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat] // MongoDB uses [longitude, latitude]
            },
            $maxDistance: radius
          }
        }
      };

      debug('MongoDB query:', JSON.stringify(query, null, 2));

      const vendors = await User.find(query)
        .select('name businessName businessType businessLocation averageRating products')
        .lean();

      console.log(`Found ${vendors.length} vendors in database:`, 
        vendors.map(v => ({
          id: v._id,
          name: v.businessName,
          coordinates: v.businessLocation?.coordinates
        }))
      );

      // Combine database vendors with active vendors
      const allVendors = new Map();
      
      // Add database vendors first
      vendors.forEach(vendor => {
        if (vendor.businessLocation?.coordinates?.length === 2) {
          allVendors.set(vendor._id.toString(), {
            _id: vendor._id,
            name: vendor.name || '',
            businessName: vendor.businessName || '',
            businessType: vendor.businessType || '',
            businessLocation: {
              type: 'Point',
              coordinates: vendor.businessLocation.coordinates,
              address: vendor.businessLocation.address || 'Location available'
            },
            averageRating: vendor.averageRating || 0,
            products: vendor.products || [],
            distance: calculateDistance(
              lat,
              lng,
              vendor.businessLocation.coordinates[1],
              vendor.businessLocation.coordinates[0]
            )
          });
        }
      });

      // Update with any active vendors that might have more recent locations
      Array.from(activeVendors.values()).forEach(vendor => {
        if (vendor.businessLocation?.coordinates?.length === 2) {
          const distance = calculateDistance(
            lat,
            lng,
            vendor.businessLocation.coordinates[1],
            vendor.businessLocation.coordinates[0]
          );

          if (distance <= radius) {
            allVendors.set(vendor._id.toString(), {
              ...vendor,
              distance
            });
          }
        }
      });

      // Convert to array and sort by distance
      const nearbyVendors = Array.from(allVendors.values())
        .sort((a, b) => a.distance - b.distance);

      console.log(`Sending ${nearbyVendors.length} nearby vendors to client`);
      socket.emit('nearby:vendors:update', nearbyVendors);
    } catch (error) {
      console.error('Error getting nearby vendors:', error);
      debug('MongoDB query error:', error);
      socket.emit('error', { 
        message: error.message || 'Failed to get nearby vendors'
      });
    }
  });

  // Handle consumer location updates - requires authentication
  socket.on('consumer:location:update', (data) => {
    if (socket.isPublic || !socket.user || socket.user.role !== 'consumer') {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }

    const { lat, lng } = data;
    activeConsumers.set(socket.user._id.toString(), {
      _id: socket.user._id,
      location: [lng, lat]
    });
  });

  // Handle vendor location updates - requires authentication
  socket.on('vendor:location:update', async (data) => {
    if (socket.isPublic || !socket.user || socket.user.role !== 'vendor') {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }

    try {
      if (!data.coordinates || !Array.isArray(data.coordinates) || data.coordinates.length !== 2) {
        socket.emit('error', { message: 'Invalid location format' });
        return;
      }

      // Create a clean vendor data object with all required fields
      const vendorData = {
        _id: socket.user._id,
        name: socket.user.name || '',
        businessName: socket.user.businessName || '',
        businessType: socket.user.businessType || '',
        businessLocation: {
          type: 'Point',
          coordinates: data.coordinates,
          address: socket.user.businessLocation?.address || 'Location available'
        },
        distance: 0,
        averageRating: socket.user.averageRating || 0,
        products: socket.user.products || [],
        lastUpdate: Date.now()
      };

      // Store vendor location in memory with socket info
      activeVendors.set(socket.user._id.toString(), {
        ...vendorData,
        socketId: socket.id
      });
      
      // Log active vendors for debugging
      console.log('Active vendors:', Array.from(activeVendors.keys()));
      
      // Send the update to the vendor to confirm their location was received
      socket.emit('vendor:location:update', vendorData);
      
      // Broadcast to other clients
      socket.broadcast.emit('vendor:location:update', vendorData);
    } catch (error) {
      console.error('Error handling vendor location update:', error);
      socket.emit('error', { message: 'Failed to update location' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    if (!socket.isPublic) {
      const userId = socketToUser.get(socket.id);
      if (userId) {
        if (socket.user?.role === 'vendor') {
          const vendorData = activeVendors.get(userId);
          if (vendorData && vendorData.socketId === socket.id) {
            activeVendors.delete(userId);
            console.log('Vendor removed from active vendors:', userId);
            socket.broadcast.emit('vendor:disconnected', { vendorId: userId });
          }
        } else if (socket.user?.role === 'consumer') {
          activeConsumers.delete(userId);
        }
        socketToUser.delete(socket.id);
      }
    }
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });
});

// Helper function to calculate distance between coordinates in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Farmer Marketplace API' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/soil', soilRoutes);
app.use('/api/ai', aiRoutes);

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start the server
const PORT = process.env.PORT || 5000;

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use, trying port ${PORT + 1}...`);
    server.listen(PORT + 1);
  } else {
    console.error('Server error:', e);
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${server.address().port}`);
  
  // Connect to MongoDB
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
});

module.exports = { app, io }; 
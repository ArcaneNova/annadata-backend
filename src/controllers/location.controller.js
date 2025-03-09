const User = require('../models/user.model');
const Product = require('../models/product.model');

// Update vendor location
const updateLocation = async (req, res) => {
  try {
    const { coordinates, address } = req.body;
    const user = req.user;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({ message: 'Invalid coordinates format' });
    }

    // Update user location in database
    await User.findByIdAndUpdate(user._id, {
      'businessLocation.coordinates': coordinates,
      'businessLocation.address': address || '',
      'businessLocation.type': 'Point'
    });

    // Find nearby users
    const nearbyUsers = await User.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates
          },
          distanceField: 'distance',
          maxDistance: 5000,
          query: { _id: { $ne: user._id } },
          spherical: true
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          distance: 1,
          'businessLocation.coordinates': 1
        }
      }
    ]);

    // Emit to connected clients if io exists
    const io = req.app.get('io');
    if (io) {
      io.emit('location:update', {
        userId: user._id,
        location: coordinates,
        nearbyUsers
      });
    } else {
      console.log('Socket.io instance not available for emit');
    }

    res.json({ message: 'Location updated successfully', user });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Error updating location' });
  }
};

// Update consumer location
const updateConsumerLocation = async (req, res) => {
  try {
    const { coordinates } = req.body;
    const consumer = req.user._id;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({ message: 'Valid coordinates [longitude, latitude] are required' });
    }

    const user = await User.findById(consumer);
    if (!user || user.role !== 'consumer') {
      return res.status(404).json({ message: 'Consumer not found' });
    }

    user.lastLocation = {
      type: 'Point',
      coordinates: coordinates
    };
    await user.save();

    // Emit to nearby vendors if io exists
    const io = req.app.get('io');
    if (!io) {
      console.log('Socket.io instance not available for emit');
      return res.json({ message: 'Location updated successfully (no socket broadcast)' });
    }

    const nearbyVendors = await User.find({
      role: 'vendor',
      isVerified: true,
      businessLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: coordinates
          },
          $maxDistance: 5000 // 5km radius
        }
      }
    }).select('_id');

    nearbyVendors.forEach(vendor => {
      try {
        io.to(`vendor:${vendor._id}`).emit('consumerNearby', {
          consumerId: consumer,
          location: user.lastLocation,
          name: user.name
        });
      } catch (emitError) {
        console.error('Error emitting to vendor:', emitError);
      }
    });

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    console.error('Update consumer location error:', error);
    res.status(500).json({ message: 'Error updating location' });
  }
};

// Get nearby vendors
const getNearbyVendors = async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const coordinates = [parseFloat(lng), parseFloat(lat)];

    const vendors = await User.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: coordinates
          },
          distanceField: 'distance',
          maxDistance: parseFloat(radius),
          spherical: true,
          query: {
            role: 'vendor',
            isVerified: true,
            'businessLocation.coordinates': { $exists: true }
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          businessName: 1,
          businessType: 1,
          businessLocation: 1,
          averageRating: 1,
          distance: 1
        }
      }
    ]);

    res.json(vendors);
  } catch (error) {
    console.error('Get nearby vendors error:', error);
    res.status(500).json({ message: 'Error fetching nearby vendors' });
  }
};

// Get nearby consumers (for vendors)
const getNearbyConsumers = async (req, res) => {
  try {
    const vendor = req.user._id;
    const vendorDoc = await User.findById(vendor);

    if (!vendorDoc || vendorDoc.role !== 'vendor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Use $geoNear aggregation for better performance and proper index usage
    const nearbyConsumers = await User.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: vendorDoc.businessLocation.coordinates
          },
          distanceField: "distance",
          maxDistance: 5000, // 5km radius
          spherical: true,
          query: {
            role: "consumer",
            isVerified: true
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          lastLocation: 1,
          distance: 1
        }
      }
    ]);

    res.json({
      consumers: nearbyConsumers.map(consumer => ({
        ...consumer,
        distance: consumer.distance / 1000 // Convert to kilometers
      })),
      total: nearbyConsumers.length
    });
  } catch (error) {
    console.error('Get nearby consumers error:', error);
    res.status(500).json({ 
      message: 'Error fetching nearby consumers',
      details: error.message 
    });
  }
};

// Get vendor location
const getVendorLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await User.findOne({
      _id: id,
      role: 'vendor'
    }).select('name businessName businessLocation businessType averageRating');

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.json({
      vendorId: vendor._id,
      name: vendor.name,
      businessName: vendor.businessName,
      businessType: vendor.businessType,
      location: vendor.businessLocation,
      rating: vendor.averageRating || 0
    });
  } catch (error) {
    console.error('Get vendor location error:', error);
    res.status(500).json({ message: 'Error fetching vendor location' });
  }
};

// Subscribe to vendor location updates
const subscribeToVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const consumer = req.user._id;

    // Join vendor-specific room
    req.app.get('io').in(consumer.toString()).socketsJoin(`vendor:${vendorId}`);

    // Send initial vendor location
    const vendor = await User.findById(vendorId).select('businessLocation businessName');
    if (vendor) {
      req.app.get('io').to(consumer.toString()).emit('vendorLocationUpdate', {
        vendorId,
        location: vendor.businessLocation,
        businessName: vendor.businessName
      });
    }

    res.json({ message: 'Subscribed to vendor location updates' });
  } catch (error) {
    console.error('Subscribe to vendor error:', error);
    res.status(500).json({ message: 'Error subscribing to vendor updates' });
  }
};

// Unsubscribe from vendor location updates
const unsubscribeFromVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const consumer = req.user._id;

    req.app.get('io').in(consumer.toString()).socketsLeave(`vendor:${vendorId}`);
    res.json({ message: 'Unsubscribed from vendor location updates' });
  } catch (error) {
    console.error('Unsubscribe from vendor error:', error);
    res.status(500).json({ message: 'Error unsubscribing from vendor updates' });
  }
};

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = {
  updateLocation,
  updateConsumerLocation,
  getNearbyVendors,
  getNearbyConsumers,
  getVendorLocation,
  subscribeToVendor,
  unsubscribeFromVendor
}; 
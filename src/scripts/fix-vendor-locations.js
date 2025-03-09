require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');

async function fixVendorLocations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const vendors = await User.find({ 
      role: 'vendor',
      isVerified: true 
    });

    console.log(`Found ${vendors.length} vendors`);
    let fixed = 0;

    for (const vendor of vendors) {
      let needsUpdate = false;
      
      // Check if businessLocation exists
      if (!vendor.businessLocation) {
        vendor.businessLocation = {
          type: 'Point',
          coordinates: [75.7022453, 31.2447532], // Default coordinates
          address: 'Default Address'
        };
        needsUpdate = true;
      }
      
      // Check if type is Point
      if (vendor.businessLocation.type !== 'Point') {
        vendor.businessLocation.type = 'Point';
        needsUpdate = true;
      }

      // Check if coordinates are valid
      if (!Array.isArray(vendor.businessLocation.coordinates) || 
          vendor.businessLocation.coordinates.length !== 2 ||
          typeof vendor.businessLocation.coordinates[0] !== 'number' ||
          typeof vendor.businessLocation.coordinates[1] !== 'number') {
        vendor.businessLocation.coordinates = [75.7022453, 31.2447532]; // Default coordinates
        needsUpdate = true;
      }

      // Check if coordinates are within valid ranges
      const [lng, lat] = vendor.businessLocation.coordinates;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        vendor.businessLocation.coordinates = [75.7022453, 31.2447532]; // Default coordinates
        needsUpdate = true;
      }

      if (needsUpdate) {
        await vendor.save();
        fixed++;
        console.log(`Fixed vendor ${vendor._id}`);
      }
    }

    console.log(`Fixed ${fixed} vendors`);
    
    // Rebuild the geospatial index
    await User.collection.dropIndex("vendor_location_2dsphere");
    await User.collection.createIndex(
      { "businessLocation.coordinates": "2dsphere", role: 1 },
      { 
        name: "vendor_location_2dsphere",
        background: true,
        partialFilterExpression: { 
          role: "vendor",
          "businessLocation.coordinates": { $exists: true }
        }
      }
    );
    console.log('Rebuilt geospatial index');

  } catch (error) {
    console.error('Error fixing vendor locations:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixVendorLocations().catch(console.error); 
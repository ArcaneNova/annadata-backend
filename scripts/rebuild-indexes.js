require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user.model');

async function rebuildIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Drop all indexes except _id
    console.log('Dropping existing indexes...');
    await User.collection.dropIndexes();
    console.log('Dropped existing indexes');

    // Create new indexes
    console.log('Creating new indexes...');
    await User.collection.createIndex(
      { "businessLocation.coordinates": "2dsphere" },
      { name: "vendor_location_2dsphere" }
    );
    await User.collection.createIndex(
      { email: 1 },
      { unique: true, name: "email_unique" }
    );

    // Verify indexes
    const indexes = await User.collection.indexes();
    console.log('Current indexes:', indexes);

    console.log('Successfully rebuilt indexes');
    process.exit(0);
  } catch (error) {
    console.error('Error rebuilding indexes:', error);
    process.exit(1);
  }
}

rebuildIndexes(); 
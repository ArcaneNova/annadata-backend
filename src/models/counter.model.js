const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

// Use mongoose.connection.model instead of mongoose.model to avoid compilation conflicts
const Counter = mongoose.connection.models.Counter || mongoose.model('Counter', counterSchema);

module.exports = Counter; 
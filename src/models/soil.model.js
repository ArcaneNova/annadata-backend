const mongoose = require('mongoose');

const soilParametersSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  N: {
    type: Number,
    required: true
  },
  P: {
    type: Number,
    required: true
  },
  K: {
    type: Number,
    required: true
  },
  temperature: {
    type: Number,
    required: true
  },
  humidity: {
    type: Number,
    required: true
  },
  ph: {
    type: Number,
    required: true
  },
  rainfall: {
    type: Number,
    required: true
  },
  recommendedCrop: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Create index for faster queries
soilParametersSchema.index({ user: 1 }, { background: true });

const SoilParameters = mongoose.model('SoilParameters', soilParametersSchema);

module.exports = SoilParameters; 
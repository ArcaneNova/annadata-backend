const express = require('express');
const router = express.Router();
const SoilParameters = require('../models/soil.model');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const axios = require('axios');

// Protect all routes
router.use(verifyToken);
router.use(checkRole('farmer')); // Only farmers can access these routes

// Get the latest soil parameters for the current user
router.get('/parameters', async (req, res) => {
  try {
    const soilParameters = await SoilParameters.findOne({ 
      user: req.user._id 
    }).sort({ createdAt: -1 });
    
    if (!soilParameters) {
      return res.status(404).json({ message: 'No soil parameters found' });
    }
    
    res.json(soilParameters);
  } catch (error) {
    console.error('Get soil parameters error:', error);
    res.status(500).json({ message: 'Error fetching soil parameters' });
  }
});

// Get all soil parameters history for the current user
router.get('/parameters/history', async (req, res) => {
  try {
    const soilParameters = await SoilParameters.find({ 
      user: req.user._id 
    }).sort({ createdAt: -1 });
    
    res.json(soilParameters);
  } catch (error) {
    console.error('Get soil parameters history error:', error);
    res.status(500).json({ message: 'Error fetching soil parameters history' });
  }
});

// Save new soil parameters
router.post('/parameters', async (req, res) => {
  try {
    const { N, P, K, temperature, humidity, ph, rainfall } = req.body;
    
    // Validate required fields
    if (!N || !P || !K || !temperature || !humidity || !ph || !rainfall) {
      return res.status(400).json({ message: 'All soil parameters are required' });
    }
    
    // Create new soil parameters
    const soilParameters = new SoilParameters({
      user: req.user._id,
      N,
      P,
      K,
      temperature,
      humidity,
      ph,
      rainfall
    });
    
    // Get crop recommendation from ML model
    try {
      const response = await axios.post('https://crop-recommendation-model-fastapi.onrender.com/predict/crop', {
        N,
        P,
        K,
        temperature,
        humidity,
        ph,
        rainfall
      });
      
      if (response.data && response.data.recommended_crop) {
        soilParameters.recommendedCrop = response.data.recommended_crop;
      }
    } catch (mlError) {
      console.error('ML model error:', mlError);
      // Continue saving parameters even if ML model fails
    }
    
    await soilParameters.save();
    
    res.status(201).json(soilParameters);
  } catch (error) {
    console.error('Save soil parameters error:', error);
    res.status(500).json({ message: 'Error saving soil parameters' });
  }
});

// Update soil parameters
router.put('/parameters/:id', async (req, res) => {
  try {
    const { N, P, K, temperature, humidity, ph, rainfall } = req.body;
    
    // Validate required fields
    if (!N || !P || !K || !temperature || !humidity || !ph || !rainfall) {
      return res.status(400).json({ message: 'All soil parameters are required' });
    }
    
    // Find and update soil parameters
    const soilParameters = await SoilParameters.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!soilParameters) {
      return res.status(404).json({ message: 'Soil parameters not found' });
    }
    
    // Update fields
    soilParameters.N = N;
    soilParameters.P = P;
    soilParameters.K = K;
    soilParameters.temperature = temperature;
    soilParameters.humidity = humidity;
    soilParameters.ph = ph;
    soilParameters.rainfall = rainfall;
    
    // Get crop recommendation from ML model
    try {
      const response = await axios.post('https://crop-recommendation-model-fastapi.onrender.com/predict/crop', {
        N,
        P,
        K,
        temperature,
        humidity,
        ph,
        rainfall
      });
      
      if (response.data && response.data.recommended_crop) {
        soilParameters.recommendedCrop = response.data.recommended_crop;
      }
    } catch (mlError) {
      console.error('ML model error:', mlError);
      // Continue saving parameters even if ML model fails
    }
    
    await soilParameters.save();
    
    res.json(soilParameters);
  } catch (error) {
    console.error('Update soil parameters error:', error);
    res.status(500).json({ message: 'Error updating soil parameters' });
  }
});

// Get crop recommendation based on soil parameters
router.post('/recommend', async (req, res) => {
  try {
    const { N, P, K, temperature, humidity, ph, rainfall } = req.body;
    
    // Validate required fields
    if (!N || !P || !K || !temperature || !humidity || !ph || !rainfall) {
      return res.status(400).json({ message: 'All soil parameters are required' });
    }
    
    // Get crop recommendation from ML model
    const response = await axios.post('https://crop-recommendation-model-fastapi.onrender.com/predict/crop', {
      N,
      P,
      K,
      temperature,
      humidity,
      ph,
      rainfall
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Crop recommendation error:', error);
    res.status(500).json({ message: 'Error getting crop recommendation' });
  }
});

module.exports = router; 
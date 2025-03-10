const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Gemini API key - use environment variable if available
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyCSJJFCOLZ872h7T3EpAvvYYYlUTU6ImkE";

// Initialize the Google AI client
let genAI;
try {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log("Google Generative AI client initialized successfully");
} catch (error) {
  console.error("Failed to initialize Google Generative AI client:", error);
}

// Add a health check endpoint for the AI routes
router.get('/health', (req, res) => {
  if (!genAI) {
    return res.status(500).json({ 
      status: 'error', 
      message: 'Google Generative AI client not initialized' 
    });
  }
  res.status(200).json({ status: 'ok', message: 'AI service is ready' });
});

// Proxy endpoint for Gemini API
router.post('/gemini', async (req, res) => {
  try {
    if (!genAI) {
      throw new Error('Google Generative AI client not initialized');
    }

    const { prompt, language } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    console.log(`Received request for language: ${language}, prompt: "${prompt.substring(0, 50)}..."`);
    
    // Prepare system prompt based on language
    let systemPrompt = "";
    switch(language) {
      case 'hindi':
        systemPrompt = "आप कृषि मित्र हैं, एक कृषि सहायक AI जो किसानों को उनके कृषि संबंधित प्रश्नों का उत्तर हिंदी में देता है। आपके पास फसल प्रबंधन, मिट्टी की उर्वरता, कीट नियंत्रण, और मौसम पैटर्न के बारे में विशेषज्ञता है।";
        break;
      case 'punjabi':
        systemPrompt = "ਤੁਸੀਂ ਕ੍ਰਿਸ਼ੀ ਮਿੱਤਰ ਹੋ, ਇੱਕ ਖੇਤੀਬਾੜੀ ਸਹਾਇਕ AI ਜੋ ਕਿਸਾਨਾਂ ਨੂੰ ਉਨ੍ਹਾਂ ਦੇ ਖੇਤੀਬਾੜੀ ਨਾਲ ਸਬੰਧਤ ਸਵਾਲਾਂ ਦੇ ਜਵਾਬ ਪੰਜਾਬੀ ਵਿੱਚ ਦਿੰਦਾ ਹੈ। ਤੁਹਾਡੇ ਕੋਲ ਫਸਲ ਪ੍ਰਬੰਧਨ, ਮਿੱਟੀ ਦੀ ਉਪਜਾਊ ਸ਼ਕਤੀ, ਕੀੜੇ ਨਿਯੰਤਰਣ, ਅਤੇ ਮੌਸਮ ਪੈਟਰਨ ਬਾਰੇ ਮੁਹਾਰਤ ਹੈ।";
        break;
      default:
        systemPrompt = "You are Krishi Mitra, an agricultural assistant AI that helps farmers with their agriculture-related questions in English. You have expertise in crop management, soil fertility, pest control, and weather patterns.";
    }

    // Get the Gemini model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    });

    console.log("Using Google AI client library to call Gemini API...");
    
    try {
      // Generate content using the Google AI client
      const fullPrompt = `${systemPrompt}\n\nUser question: ${prompt}`;
      console.log("Full prompt:", fullPrompt);
      
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();
      
      console.log("Gemini API response received successfully");
      console.log("Response text:", text.substring(0, 100) + "...");
      
      // Send response back to client
      res.json({ response: text });
    } catch (apiError) {
      console.error("Gemini API request failed:", apiError.message);
      
      // Provide a fallback response based on language
      let fallbackResponse;
      switch(language) {
        case 'hindi':
          fallbackResponse = "क्षमा करें, मैं अभी आपके प्रश्न का उत्तर नहीं दे पा रहा हूँ। कृपया बाद में पुनः प्रयास करें।";
          break;
        case 'punjabi':
          fallbackResponse = "ਮੁਆਫ ਕਰਨਾ, ਮੈਂ ਹੁਣੇ ਤੁਹਾਡੇ ਸਵਾਲ ਦਾ ਜਵਾਬ ਨਹੀਂ ਦੇ ਸਕਦਾ। ਕਿਰਪਾ ਕਰਕੇ ਬਾਅਦ ਵਿੱਚ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।";
          break;
        default:
          fallbackResponse = "I apologize, but I'm unable to answer your question right now. Please try again later.";
      }
      
      res.json({ 
        response: fallbackResponse,
        error: apiError.message
      });
    }
  } catch (error) {
    console.error('Error in /gemini endpoint:', error.message);
    res.status(500).json({ 
      error: 'Failed to get response from AI',
      details: error.message
    });
  }
});

module.exports = router; 
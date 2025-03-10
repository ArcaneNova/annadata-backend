# CORS Configuration Documentation

## Overview

This document explains the Cross-Origin Resource Sharing (CORS) configuration for the Farmer Marketplace API.

## Server Configuration

The application uses a dynamic CORS configuration that adapts based on the environment:

- In **development**, all origins are allowed to facilitate local testing and development.
- In **production**, the application can be configured to either:
  - Allow all origins (current default)
  - Restrict to specific allowed origins (configurable via environment variables)

## Implementation Details

### Express Server (server.js)

The main CORS configuration is implemented in `server.js` using the `cors` middleware package:

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests, etc)
    if (!origin) return callback(null, true);
    
    // In production, you can specify allowed origins if needed
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      process.env.CLIENT_URL,
      process.env.PRODUCTION_CLIENT_URL
    ].filter(Boolean); // Filter out undefined values
    
    // For security in production, check if origin is in allowed list
    // In development or if no specific origins are defined, allow all
    if (process.env.NODE_ENV === 'production' && allowedOrigins.length > 0) {
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    } else {
      // In development or if no allowed origins are specified, allow all origins
      callback(null, true);
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Origin", "Accept"],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle OPTIONS requests for preflight
app.options('*', cors(corsOptions));
```

### Vercel Deployment (vercel.json)

For Vercel deployments, CORS headers are also configured in `vercel.json`:

```json
{
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.js",
      "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      "headers": {
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "X-Requested-With, Content-Type, Accept, Authorization, Origin",
        "Access-Control-Max-Age": "86400"
      }
    }
  ]
}
```

Note: The `Access-Control-Allow-Origin` header is not set in `vercel.json` because it's dynamically handled by the Express server based on the request origin.

## Environment Variables

To configure allowed origins in production, set the following environment variables:

- `CLIENT_URL`: The main client application URL
- `PRODUCTION_CLIENT_URL`: Additional production client URL if needed
- `NODE_ENV`: Set to 'production' to enable origin restrictions

## Socket.IO Configuration

Socket.IO uses the same CORS configuration as the Express server to maintain consistency.

## Security Considerations

- In production with restricted origins, only specified domains and Vercel deployments (ending with `.vercel.app`) are allowed
- Credentials are supported for authenticated requests
- Preflight requests are cached for 24 hours to improve performance 
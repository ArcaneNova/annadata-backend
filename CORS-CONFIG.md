# CORS Configuration Documentation

## Overview

This document explains the Cross-Origin Resource Sharing (CORS) configuration for the Farmer Marketplace API.

## Server Configuration

The application uses an open CORS configuration that allows requests from all origins in both development and production environments:

- All origins are allowed (`Access-Control-Allow-Origin: *`)
- All standard HTTP methods are supported
- Common headers are allowed
- Credentials are supported
- Preflight requests are cached for 24 hours

## Implementation Details

### Express Server (server.js)

The main CORS configuration is implemented in `server.js` using the `cors` middleware package:

```javascript
const corsOptions = {
  origin: '*', // Allow all origins
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

For Vercel deployments, CORS headers are configured in `vercel.json`:

```json
{
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.js",
      "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      "headers": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "X-Requested-With, Content-Type, Accept, Authorization, Origin",
        "Access-Control-Max-Age": "86400"
      }
    }
  ]
}
```

## Socket.IO Configuration

Socket.IO uses the same open CORS configuration:

```javascript
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Origin", "Accept"],
    credentials: true
  }
});
```

## Security Considerations

- This configuration allows requests from any domain
- While this is less secure than restricting origins, it provides maximum accessibility
- API security should be enforced through other means:
  - Strong authentication
  - Input validation
  - Rate limiting
  - Request validation
  - Proper error handling 
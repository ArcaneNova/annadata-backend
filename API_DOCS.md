# Farmer Marketplace API Documentation

## Authentication APIs

### Register User
- **Endpoint**: `POST /api/auth/register/{role}`
- **Roles**: `farmer`, `vendor`, `consumer`, `admin`
- **Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "phone": "1234567890"
}
```
- **Response (201)**:
```json
{
  "message": "Registration successful. Please check your email for verification."
}
```

### Verify Email
- **Endpoint**: `POST /api/auth/verify-email`
- **Request Body**:
```json
{
  "email": "john@example.com",
  "token": "123456"
}
```
- **Response (200)**:
```json
{
  "message": "Email verified successfully"
}
```

### Login
- **Endpoint**: `POST /api/auth/login/{role}`
- **Roles**: `farmer`, `vendor`, `consumer`, `admin`
- **Request Body**:
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```
- **Response (200)**:
```json
{
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "farmer",
    "phone": "1234567890"
  }
}
```

### Forgot Password
- **Endpoint**: `POST /api/auth/forgot-password`
- **Request Body**:
```json
{
  "email": "john@example.com"
}
```
- **Response (200)**:
```json
{
  "message": "Password reset instructions sent to your email"
}
```

### Reset Password
- **Endpoint**: `POST /api/auth/reset-password`
- **Request Body**:
```json
{
  "email": "john@example.com",
  "token": "123456",
  "newPassword": "newSecurePassword"
}
```
- **Response (200)**:
```json
{
  "message": "Password reset successful"
}
```

## Product APIs

### Create Product
- **Endpoint**: `POST /api/products`
- **Authentication**: Required (Farmer/Vendor)
- **Content-Type**: `multipart/form-data`
- **Request Body**:
```json
{
  "name": "Fresh Tomatoes",
  "description": "Farm fresh organic tomatoes",
  "category": "vegetables",
  "price": 50,
  "stock": 100,
  "unit": "kg",
  "images": [File1, File2] // Max 5 images
}
```
- **Response (201)**:
```json
{
  "message": "Product created successfully",
  "product": {
    "_id": "product_id",
    "name": "Fresh Tomatoes",
    "description": "Farm fresh organic tomatoes",
    "category": "vegetables",
    "price": 50,
    "stock": 100,
    "unit": "kg",
    "seller": "user_id",
    "sellerType": "farmer",
    "images": [
      {
        "url": "image_url",
        "public_id": "cloudinary_public_id"
      }
    ],
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

### Update Product
- **Endpoint**: `PUT /api/products/:id`
- **Authentication**: Required (Product Owner)
- **Content-Type**: `multipart/form-data`
- **Request Body**: Same as Create Product (all fields optional)
- **Response (200)**:
```json
{
  "message": "Product updated successfully",
  "product": {
    // Updated product object
  }
}
```

### Delete Product
- **Endpoint**: `DELETE /api/products/:id`
- **Authentication**: Required (Product Owner)
- **Response (200)**:
```json
{
  "message": "Product deleted successfully"
}
```

### Get Products
- **Endpoint**: `GET /api/products`
- **Authentication**: Not Required
- **Query Parameters**:
  - `category`: Filter by category
  - `minPrice`: Minimum price
  - `maxPrice`: Maximum price
  - `sellerType`: Filter by seller type (farmer/vendor)
  - `search`: Search in name and description
  - `sort`: Sort field (default: createdAt)
  - `order`: Sort order (asc/desc)
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Response (200)**:
```json
{
  "products": [
    {
      "_id": "product_id",
      "name": "Fresh Tomatoes",
      "description": "Farm fresh organic tomatoes",
      "category": "vegetables",
      "price": 50,
      "stock": 100,
      "unit": "kg",
      "seller": {
        "_id": "user_id",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "1234567890"
      },
      "images": [
        {
          "url": "image_url",
          "public_id": "cloudinary_public_id"
        }
      ]
    }
  ],
  "page": 1,
  "totalPages": 5,
  "total": 50
}
```

### Get Single Product
- **Endpoint**: `GET /api/products/:id`
- **Authentication**: Not Required
- **Response (200)**:
```json
{
  "_id": "product_id",
  "name": "Fresh Tomatoes",
  "description": "Farm fresh organic tomatoes",
  "category": "vegetables",
  "price": 50,
  "stock": 100,
  "unit": "kg",
  "seller": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "averageRating": 4.5
  },
  "images": [
    {
      "url": "image_url",
      "public_id": "cloudinary_public_id"
    }
  ],
  "ratings": [
    {
      "user": {
        "_id": "user_id",
        "name": "Jane Doe"
      },
      "rating": 5,
      "review": "Great quality!",
      "createdAt": "timestamp"
    }
  ],
  "averageRating": 4.5,
  "totalRatings": 10
}
```

### Update Product Margin
- **Endpoint**: `PUT /api/products/:id/margin`
- **Authentication**: Required (Admin only)
- **Request Body**:
```json
{
  "marginPercentage": 15
}
```
- **Response (200)**:
```json
{
  "message": "Product margin updated successfully",
  "product": {
    // Updated product object with new margin
  }
}
```

## Order APIs

### Create Order
- **Endpoint**: `POST /api/orders`
- **Authentication**: Required (Consumer only)
- **Request Body**:
```json
{
  "items": [
    {
      "product": "product_id",
      "quantity": 2
    }
  ],
  "deliveryAddress": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "coordinates": {
      "coordinates": [72.8777, 19.0760]
    }
  },
  "paymentMethod": "razorpay"
}
```
- **Response (201)**:
```json
{
  "message": "Order created successfully",
  "order": {
    "_id": "order_id",
    "buyer": "user_id",
    "seller": "seller_id",
    "items": [
      {
        "product": "product_id",
        "quantity": 2,
        "price": 100,
        "unit": "kg"
      }
    ],
    "totalAmount": 200,
    "status": "pending",
    "paymentStatus": "pending",
    "paymentMethod": "razorpay",
    "deliveryAddress": {
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "coordinates": {
        "type": "Point",
        "coordinates": [72.8777, 19.0760]
      }
    }
  },
  "razorpayOrder": {
    "id": "razorpay_order_id",
    "amount": 20000,
    "currency": "INR"
  }
}
```

### Verify Payment
- **Endpoint**: `POST /api/orders/verify-payment`
- **Authentication**: Required (Consumer only)
- **Request Body**:
```json
{
  "orderId": "razorpay_order_id",
  "razorpayPaymentId": "razorpay_payment_id",
  "razorpaySignature": "generated_signature"
}
```
- **Response (200)**:
```json
{
  "message": "Payment verified successfully"
}
```

### Update Order Status
- **Endpoint**: `PUT /api/orders/:id/status`
- **Authentication**: Required (Vendor/Farmer only)
- **Request Body**:
```json
{
  "status": "accepted" // or "rejected", "in-transit", "delivered"
}
```
- **Response (200)**:
```json
{
  "message": "Order status updated successfully",
  "order": {
    // Updated order object
  }
}
```

### Cancel Order
- **Endpoint**: `POST /api/orders/:id/cancel`
- **Authentication**: Required (Any role)
- **Request Body**:
```json
{
  "reason": "Reason for cancellation"
}
```
- **Response (200)**:
```json
{
  "message": "Order cancelled successfully",
  "order": {
    // Updated order object with cancelled status
  }
}
```

### Get Orders
- **Endpoint**: `GET /api/orders`
- **Authentication**: Required
- **Query Parameters**:
  - `role`: Filter by role (buyer/seller)
  - `status`: Filter by order status
  - `startDate`: Filter by start date
  - `endDate`: Filter by end date
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Response (200)**:
```json
{
  "orders": [
    {
      "_id": "order_id",
      "buyer": {
        "_id": "user_id",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "1234567890"
      },
      "seller": {
        "_id": "seller_id",
        "name": "Vendor Name",
        "email": "vendor@example.com",
        "phone": "9876543210"
      },
      "items": [
        {
          "product": {
            "_id": "product_id",
            "name": "Product Name",
            "images": [
              {
                "url": "image_url"
              }
            ]
          },
          "quantity": 2,
          "price": 100,
          "unit": "kg"
        }
      ],
      "totalAmount": 200,
      "status": "pending",
      "paymentStatus": "pending",
      "createdAt": "timestamp"
    }
  ],
  "page": 1,
  "totalPages": 5,
  "total": 50
}
```

### Get Single Order
- **Endpoint**: `GET /api/orders/:id`
- **Authentication**: Required (Order buyer or seller only)
- **Response (200)**:
```json
{
  "_id": "order_id",
  "buyer": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890"
  },
  "seller": {
    "_id": "seller_id",
    "name": "Vendor Name",
    "email": "vendor@example.com",
    "phone": "9876543210"
  },
  "items": [
    {
      "product": {
        "_id": "product_id",
        "name": "Product Name",
        "description": "Product Description",
        "images": [
          {
            "url": "image_url"
          }
        ]
      },
      "quantity": 2,
      "price": 100,
      "unit": "kg"
    }
  ],
  "totalAmount": 200,
  "status": "pending",
  "paymentStatus": "pending",
  "paymentMethod": "razorpay",
  "deliveryAddress": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "coordinates": {
      "type": "Point",
      "coordinates": [72.8777, 19.0760]
    }
  },
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Real-time Events
The following Socket.IO events are emitted for real-time updates:

1. **newOrder**
   - Emitted when a new order is created
   - Data: `{ orderId, seller }`

2. **orderStatusUpdate**
   - Emitted when order status is updated
   - Data: `{ orderId, status, buyer }`

3. **orderCancelled**
   - Emitted when an order is cancelled
   - Data: `{ orderId, buyer, seller }`

To receive these events, the client should:
1. Connect to the Socket.IO server
2. Authenticate by emitting the 'authenticate' event with their userId
3. Listen for the relevant events

Example Socket.IO client setup:
```javascript
const socket = io('http://your-api-url');

// Authenticate after connecting
socket.on('connect', () => {
  socket.emit('authenticate', userId);
});

// Listen for events
socket.on('newOrder', (data) => {
  console.log('New order received:', data);
});

socket.on('orderStatusUpdate', (data) => {
  console.log('Order status updated:', data);
});

socket.on('orderCancelled', (data) => {
  console.log('Order cancelled:', data);
});
```

## Location APIs

### Update Vendor Location
- **Endpoint**: `POST /api/location/update`
- **Authentication**: Required (Vendor only)
- **Request Body**:
```json
{
  "coordinates": [72.8347, 19.1582]
}
```
- **Response (200)**:
```json
{
  "message": "Location updated successfully",
  "location": {
    "type": "Point",
    "coordinates": [72.8347, 19.1582]
  }
}
```

### Get Nearby Vendors
- **Endpoint**: `GET /api/location/nearby`
- **Authentication**: Required (Consumer only)
- **Query Parameters**:
  - `latitude`: Consumer's latitude (required)
  - `longitude`: Consumer's longitude (required)
  - `radius`: Search radius in meters (default: 500)
  - `type`: Filter by vendor type ('thela' for mobile vendors)
- **Response (200)**:
```json
{
  "vendors": [
    {
      "_id": "vendor_id",
      "name": "John's Fresh Vegetables",
      "phone": "1234567890",
      "location": {
        "type": "Point",
        "coordinates": [72.8347, 19.1582]
      },
      "averageRating": 4.5,
      "distance": 320.45
    },
    {
      "_id": "vendor_id2",
      "name": "Fresh Fruits Cart",
      "phone": "9876543210",
      "location": {
        "type": "Point",
        "coordinates": [72.8350, 19.1585]
      },
      "averageRating": 4.2,
      "distance": 450.12
    }
  ]
}
```

### Get Vendor Location
- **Endpoint**: `GET /api/location/vendor/:id`
- **Authentication**: Required
- **Response (200)**:
```json
{
  "vendorId": "vendor_id",
  "name": "John's Fresh Vegetables",
  "isThelaWala": true,
  "location": {
    "type": "Point",
    "coordinates": [72.8347, 19.1582]
  }
}
```

### Subscribe to Vendor Location Updates
- **Endpoint**: `POST /api/location/subscribe/:vendorId`
- **Authentication**: Required (Consumer only)
- **Response (200)**:
```json
{
  "message": "Subscribed to vendor location updates"
}
```

### Unsubscribe from Vendor Location Updates
- **Endpoint**: `POST /api/location/unsubscribe/:vendorId`
- **Authentication**: Required (Consumer only)
- **Response (200)**:
```json
{
  "message": "Unsubscribed from vendor location updates"
}
```

### Real-time Events
The following Socket.IO events are available for location tracking:

1. **locationUpdate**
   - Emitted when a vendor updates their location
   - Data:
   ```json
   {
     "vendorId": "vendor_id",
     "location": {
       "type": "Point",
       "coordinates": [72.8347, 19.1582]
     }
   }
   ```

2. **vendorNearby**
   - Emitted when a vendor comes within range of a consumer
   - Data:
   ```json
   {
     "vendorId": "vendor_id",
     "vendorName": "John's Fresh Vegetables",
     "location": [72.8347, 19.1582]
   }
   ```

### Error Responses
- **400 Bad Request**:
```json
{
  "error": "Invalid coordinates"
}
```
- **401 Unauthorized**:
```json
{
  "error": "Authentication required"
}
```
- **403 Forbidden**:
```json
{
  "error": "Only thela walas can update location"
}
```
- **404 Not Found**:
```json
{
  "error": "Vendor not found"
}
```

### Notes
1. Coordinates are provided in [longitude, latitude] format
2. Distance is returned in meters
3. Real-time updates require Socket.IO client setup
4. Location updates are broadcast to all subscribed consumers within range
5. Mobile vendors (thela walas) can be filtered separately
6. Nearby search uses MongoDB's geospatial queries
7. Maximum search radius is 5000 meters

## Rating APIs

### Add Product Rating
- **Endpoint**: `POST /api/ratings/products/:productId`
- **Authentication**: Required (Consumer only)
- **Request Body**:
```json
{
  "rating": 5,
  "review": "Excellent quality tomatoes! Very fresh and perfectly ripe.",
  "images": ["base64_image_data"] // Optional: Upload images with review
}
```
- **Response (201)**:
```json
{
  "message": "Rating added successfully",
  "rating": {
    "_id": "rating_id",
    "product": {
      "_id": "product_id",
      "name": "Fresh Tomatoes"
    },
    "user": {
      "_id": "user_id",
      "name": "John Doe"
    },
    "rating": 5,
    "review": "Excellent quality tomatoes! Very fresh and perfectly ripe.",
    "images": [
      {
        "url": "image_url",
        "public_id": "cloudinary_public_id"
      }
    ],
    "verified": true,
    "createdAt": "2024-02-20T10:30:00Z"
  },
  "productAverage": {
    "rating": 4.5,
    "totalRatings": 10
  }
}
```

### Update Product Rating
- **Endpoint**: `PUT /api/ratings/products/:productId`
- **Authentication**: Required (Consumer only)
- **Request Body**:
```json
{
  "rating": 4,
  "review": "Updated: Good quality but slightly overpriced.",
  "images": ["base64_image_data"],
  "removeImages": ["image_public_id"] // Optional: Remove existing images
}
```
- **Response (200)**:
```json
{
  "message": "Rating updated successfully",
  "rating": {
    "_id": "rating_id",
    "product": {
      "_id": "product_id",
      "name": "Fresh Tomatoes"
    },
    "rating": 4,
    "review": "Updated: Good quality but slightly overpriced.",
    "images": [
      {
        "url": "new_image_url",
        "public_id": "new_cloudinary_public_id"
      }
    ],
    "updatedAt": "2024-02-20T11:30:00Z"
  },
  "productAverage": {
    "rating": 4.4,
    "totalRatings": 10
  }
}
```

### Get Product Ratings
- **Endpoint**: `GET /api/ratings/products/:productId`
- **Authentication**: Not Required
- **Query Parameters**:
  - `sort`: Sort by ('recent', 'helpful', 'rating'). Default: 'recent'
  - `filter`: Filter by rating value (1-5)
  - `withImages`: Filter reviews with images (true/false)
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Response (200)**:
```json
{
  "ratings": [
    {
      "_id": "rating_id1",
      "user": {
        "_id": "user_id",
        "name": "John Doe",
        "profileImage": "profile_image_url"
      },
      "rating": 5,
      "review": "Excellent quality tomatoes! Very fresh and perfectly ripe.",
      "images": [
        {
          "url": "image_url",
          "public_id": "cloudinary_public_id"
        }
      ],
      "helpful": 12,
      "verified": true,
      "createdAt": "2024-02-20T10:30:00Z"
    },
    {
      "_id": "rating_id2",
      "user": {
        "_id": "user_id2",
        "name": "Jane Smith",
        "profileImage": "profile_image_url"
      },
      "rating": 4,
      "review": "Good quality but slightly overpriced.",
      "helpful": 8,
      "verified": true,
      "createdAt": "2024-02-19T15:45:00Z"
    }
  ],
  "summary": {
    "averageRating": 4.5,
    "totalRatings": 10,
    "ratingDistribution": {
      "5": 6,
      "4": 3,
      "3": 1,
      "2": 0,
      "1": 0
    },
    "withImages": 5,
    "verifiedPurchases": 8
  },
  "page": 1,
  "totalPages": 1,
  "hasMore": false
}
```

### Mark Rating as Helpful
- **Endpoint**: `POST /api/ratings/:ratingId/helpful`
- **Authentication**: Required
- **Response (200)**:
```json
{
  "message": "Rating marked as helpful",
  "helpful": 13
}
```

### Report Rating
- **Endpoint**: `POST /api/ratings/:ratingId/report`
- **Authentication**: Required
- **Request Body**:
```json
{
  "reason": "inappropriate_content",
  "details": "Contains offensive language"
}
```
- **Response (200)**:
```json
{
  "message": "Rating reported successfully",
  "reportId": "report_id"
}
```

### Add Seller Rating
- **Endpoint**: `POST /api/ratings/sellers/:sellerId`
- **Authentication**: Required (Consumer only)
- **Request Body**:
```json
{
  "rating": 5,
  "review": "Great seller! Very professional and punctual delivery.",
  "orderId": "order_id", // Optional: Link rating to specific order
  "categories": {
    "communication": 5,
    "delivery": 4,
    "quality": 5
  }
}
```
- **Response (201)**:
```json
{
  "message": "Seller rating added successfully",
  "rating": {
    "_id": "rating_id",
    "seller": {
      "_id": "seller_id",
      "name": "Fresh Farms"
    },
    "user": {
      "_id": "user_id",
      "name": "John Doe"
    },
    "rating": 5,
    "review": "Great seller! Very professional and punctual delivery.",
    "categories": {
      "communication": 5,
      "delivery": 4,
      "quality": 5
    },
    "order": "order_id",
    "verified": true,
    "createdAt": "2024-02-20T10:30:00Z"
  },
  "sellerAverage": {
    "overall": 4.7,
    "categories": {
      "communication": 4.8,
      "delivery": 4.5,
      "quality": 4.9
    },
    "totalRatings": 25
  }
}
```

### Get Seller Ratings
- **Endpoint**: `GET /api/ratings/sellers/:sellerId`
- **Authentication**: Not Required
- **Query Parameters**:
  - `sort`: Sort by ('recent', 'rating'). Default: 'recent'
  - `filter`: Filter by rating value (1-5)
  - `verified`: Filter verified purchases only (true/false)
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Response (200)**:
```json
{
  "ratings": [
    {
      "_id": "rating_id",
      "user": {
        "_id": "user_id",
        "name": "John Doe",
        "profileImage": "profile_image_url"
      },
      "rating": 5,
      "review": "Great seller! Very professional and punctual delivery.",
      "categories": {
        "communication": 5,
        "delivery": 4,
        "quality": 5
      },
      "order": {
        "_id": "order_id",
        "items": ["Fresh Tomatoes", "Potatoes"]
      },
      "verified": true,
      "createdAt": "2024-02-20T10:30:00Z"
    }
  ],
  "summary": {
    "overall": 4.7,
    "categories": {
      "communication": 4.8,
      "delivery": 4.5,
      "quality": 4.9
    },
    "ratingDistribution": {
      "5": 15,
      "4": 8,
      "3": 2,
      "2": 0,
      "1": 0
    },
    "totalRatings": 25,
    "verifiedPurchases": 22
  },
  "page": 1,
  "totalPages": 3,
  "hasMore": true
}
```

### Real-time Events
The following Socket.IO events are available for rating notifications:

1. **newRating**
   - Emitted when a product receives a new rating
   - Data:
   ```json
   {
     "type": "product",
     "productId": "product_id",
     "productName": "Fresh Tomatoes",
     "rating": 5,
     "review": "Excellent quality!",
     "user": {
       "_id": "user_id",
       "name": "John Doe"
     },
     "timestamp": "2024-02-20T10:30:00Z"
   }
   ```

2. **newSellerRating**
   - Emitted when a seller receives a new rating
   - Data:
   ```json
   {
     "type": "seller",
     "sellerId": "seller_id",
     "rating": 5,
     "categories": {
       "communication": 5,
       "delivery": 4,
       "quality": 5
     },
     "user": {
       "_id": "user_id",
       "name": "John Doe"
     },
     "timestamp": "2024-02-20T10:30:00Z"
   }
   ```

### Error Responses
- **400 Bad Request**:
```json
{
  "error": "Invalid rating value",
  "details": "Rating must be between 1 and 5"
}
```
- **401 Unauthorized**:
```json
{
  "error": "Authentication required"
}
```
- **403 Forbidden**:
```json
{
  "error": "Can only rate after verified purchase"
}
```
- **404 Not Found**:
```json
{
  "error": "Product/Seller not found"
}
```
- **409 Conflict**:
```json
{
  "error": "Rating already exists",
  "details": "Use PUT method to update existing rating"
}
```

### Notes
1. Ratings can only be added by verified purchasers
2. Images are optional for product ratings
3. Seller ratings include category-specific scores
4. Rating updates maintain review history
5. Helpful votes are unique per user
6. Reports are reviewed by moderators
7. Real-time notifications for new ratings
8. Rating analytics include distribution and averages

## Admin APIs

### Get All Users
- **Endpoint**: `GET /api/admin/users`
- **Authentication**: Required (Admin only)
- **Query Parameters**:
  - `role`: Filter by user role (farmer/vendor/consumer)
  - `status`: Filter by verification status (verified/unverified)
  - `search`: Search by name or email
  - `sortBy`: Sort by field (created/name/role)
  - `order`: Sort order (asc/desc)
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Response (200)**:
```json
{
  "users": [
    {
      "_id": "user_id1",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "1234567890",
      "role": "farmer",
      "isVerified": true,
      "isActive": true,
      "location": {
        "city": "Mumbai",
        "state": "Maharashtra"
      },
      "stats": {
        "totalOrders": 150,
        "totalRevenue": 75000,
        "averageRating": 4.5
      },
      "documents": {
        "idProof": {
          "type": "aadhar",
          "verified": true,
          "verifiedAt": "2024-01-15T10:00:00Z"
        },
        "businessLicense": {
          "type": "shop_act",
          "verified": true,
          "verifiedAt": "2024-01-15T10:00:00Z"
        }
      },
      "createdAt": "2024-01-15T10:00:00Z",
      "lastActive": "2024-02-20T15:30:00Z"
    }
  ],
  "summary": {
    "total": 150,
    "active": 145,
    "inactive": 5,
    "roleDistribution": {
      "farmer": 50,
      "vendor": 30,
      "consumer": 70
    },
    "verificationStatus": {
      "verified": 140,
      "pending": 10
    }
  },
  "page": 1,
  "totalPages": 15,
  "hasMore": true
}
```

### Get User Details
- **Endpoint**: `GET /api/admin/users/:userId`
- **Authentication**: Required (Admin only)
- **Response (200)**:
```json
{
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "role": "farmer",
    "isVerified": true,
    "isActive": true,
    "location": {
      "street": "123 Farm Road",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "coordinates": {
        "type": "Point",
        "coordinates": [72.8347, 19.1582]
      }
    },
    "businessDetails": {
      "name": "John's Fresh Farm",
      "type": "individual",
      "gst": "22AAAAA0000A1Z5",
      "pan": "AAAAA0000A"
    },
    "documents": {
      "idProof": {
        "type": "aadhar",
        "number": "XXXX-XXXX-1234",
        "url": "document_url",
        "verified": true,
        "verifiedAt": "2024-01-15T10:00:00Z",
        "verifiedBy": "admin_id"
      },
      "businessLicense": {
        "type": "shop_act",
        "number": "SHOP123456",
        "url": "document_url",
        "verified": true,
        "verifiedAt": "2024-01-15T10:00:00Z",
        "verifiedBy": "admin_id"
      }
    },
    "stats": {
      "totalOrders": 150,
      "totalRevenue": 75000,
      "averageRating": 4.5,
      "totalProducts": 25,
      "activeProducts": 20
    },
    "bankDetails": {
      "accountHolder": "John Doe",
      "accountNumber": "XXXXX1234",
      "ifsc": "BANK0001234",
      "verified": true
    },
    "createdAt": "2024-01-15T10:00:00Z",
    "lastActive": "2024-02-20T15:30:00Z",
    "activityLog": [
      {
        "action": "product_added",
        "details": "Added Fresh Tomatoes",
        "timestamp": "2024-02-20T10:30:00Z"
      },
      {
        "action": "order_completed",
        "details": "Order #123 delivered",
        "timestamp": "2024-02-19T14:20:00Z"
      }
    ]
  }
}
```

### Update User Status
- **Endpoint**: `PUT /api/admin/users/:userId/status`
- **Authentication**: Required (Admin only)
- **Request Body**:
```json
{
  "isVerified": true,
  "isActive": true,
  "verificationNotes": "All documents verified successfully",
  "documentVerification": {
    "idProof": {
      "verified": true,
      "notes": "Valid Aadhar card"
    },
    "businessLicense": {
      "verified": true,
      "notes": "Valid Shop Act license"
    }
  }
}
```
- **Response (200)**:
```json
{
  "message": "User status updated successfully",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "farmer",
    "isVerified": true,
    "isActive": true,
    "documents": {
      "idProof": {
        "verified": true,
        "verifiedAt": "2024-02-20T16:00:00Z",
        "verifiedBy": "admin_id"
      },
      "businessLicense": {
        "verified": true,
        "verifiedAt": "2024-02-20T16:00:00Z",
        "verifiedBy": "admin_id"
      }
    },
    "updatedAt": "2024-02-20T16:00:00Z"
  }
}
```

### Get Sales Analytics
- **Endpoint**: `GET /api/admin/analytics/sales`
- **Authentication**: Required (Admin only)
- **Query Parameters**:
  - `startDate`: Start date for analytics (YYYY-MM-DD)
  - `endDate`: End date for analytics (YYYY-MM-DD)
  - `groupBy`: Group results by (day/week/month)
  - `category`: Filter by product category
  - `sellerType`: Filter by seller type (farmer/vendor)
- **Response (200)**:
```json
{
  "analytics": [
    {
      "_id": "2024-02-20",
      "totalOrders": 25,
      "totalRevenue": 12500.00,
      "averageOrderValue": 500.00,
      "categories": {
        "vegetables": {
          "orders": 15,
          "revenue": 7500.00
        },
        "fruits": {
          "orders": 10,
          "revenue": 5000.00
        }
      },
      "paymentMethods": {
        "razorpay": {
          "count": 20,
          "amount": 10000.00
        },
        "cod": {
          "count": 5,
          "amount": 2500.00
        }
      },
      "orderStatus": {
        "delivered": 20,
        "in-transit": 3,
        "cancelled": 2
      }
    }
  ],
  "summary": {
    "period": {
      "start": "2024-02-01",
      "end": "2024-02-20"
    },
    "totals": {
      "orders": 450,
      "revenue": 225000.00,
      "averageOrderValue": 500.00
    },
    "growth": {
      "orders": 15.5,
      "revenue": 20.3
    },
    "categories": {
      "vegetables": {
        "orders": 270,
        "revenue": 135000.00,
        "growth": 18.5
      },
      "fruits": {
        "orders": 180,
        "revenue": 90000.00,
        "growth": 12.8
      }
    },
    "sellerPerformance": [
      {
        "seller": {
          "_id": "seller_id",
          "name": "John's Fresh Farm",
          "type": "farmer"
        },
        "orders": 85,
        "revenue": 42500.00,
        "growth": 25.5
      }
    ]
  },
  "trends": {
    "topProducts": [
      {
        "product": {
          "_id": "product_id",
          "name": "Fresh Tomatoes"
        },
        "orders": 120,
        "revenue": 60000.00,
        "growth": 30.5
      }
    ],
    "topSellers": [
      {
        "seller": {
          "_id": "seller_id",
          "name": "John's Fresh Farm"
        },
        "orders": 85,
        "revenue": 42500.00,
        "rating": 4.5
      }
    ],
    "peakHours": [
      {
        "hour": 9,
        "orders": 45,
        "revenue": 22500.00
      }
    ]
  }
}
```

### Get Revenue Reports
- **Endpoint**: `GET /api/admin/analytics/revenue`
- **Authentication**: Required (Admin only)
- **Query Parameters**:
  - `startDate`: Start date for report (YYYY-MM-DD)
  - `endDate`: End date for report (YYYY-MM-DD)
  - `type`: Report type (daily/weekly/monthly)
  - `format`: Response format (json/csv/excel)
- **Response (200)**:
```json
{
  "reports": [
    {
      "seller": {
        "_id": "seller_id",
        "name": "John's Fresh Farm",
        "role": "farmer",
        "location": {
          "city": "Mumbai",
          "state": "Maharashtra"
        }
      },
      "metrics": {
        "orders": {
          "total": 150,
          "completed": 140,
          "cancelled": 10
        },
        "revenue": {
          "gross": 75000.00,
          "platformFee": 3750.00,
          "taxes": 3375.00,
          "net": 67875.00
        },
        "products": {
          "total": 25,
          "active": 20,
          "outOfStock": 5
        }
      },
      "performance": {
        "orderCompletionRate": 93.3,
        "averageRating": 4.5,
        "customerRetention": 65.5
      },
      "trends": {
        "revenueGrowth": 20.5,
        "orderGrowth": 15.8,
        "topProducts": [
          {
            "name": "Fresh Tomatoes",
            "orders": 50,
            "revenue": 25000.00
          }
        ]
      }
    }
  ],
  "summary": {
    "totalSellers": 80,
    "activeSellers": 75,
    "revenue": {
      "gross": 2000000.00,
      "platformFee": 100000.00,
      "taxes": 90000.00,
      "net": 1810000.00
    },
    "averages": {
      "revenuePerSeller": 25000.00,
      "ordersPerSeller": 50,
      "rating": 4.3
    },
    "distribution": {
      "byType": {
        "farmer": {
          "sellers": 50,
          "revenue": 1200000.00
        },
        "vendor": {
          "sellers": 30,
          "revenue": 800000.00
        }
      },
      "byLocation": [
        {
          "city": "Mumbai",
          "sellers": 30,
          "revenue": 800000.00
        }
      ]
    }
  }
}
```

### Error Responses
- **400 Bad Request**:
```json
{
  "error": "Invalid date range",
  "details": "End date cannot be before start date"
}
```
- **401 Unauthorized**:
```json
{
  "error": "Authentication required"
}
```
- **403 Forbidden**:
```json
{
  "error": "Insufficient permissions",
  "details": "Admin access required"
}
```
- **404 Not Found**:
```json
{
  "error": "User not found"
}
```
- **422 Unprocessable Entity**:
```json
{
  "error": "Invalid report parameters",
  "details": "Invalid grouping period specified"
}
```

### Real-time Events
The following Socket.IO events are available for admin notifications:

1. **userVerificationRequest**
   - Emitted when a new user submits verification documents
   - Data:
   ```json
   {
     "userId": "user_id",
     "name": "John Doe",
     "role": "farmer",
     "documents": {
       "idProof": {
         "type": "aadhar",
         "url": "document_url"
       },
       "businessLicense": {
         "type": "shop_act",
         "url": "document_url"
       }
     },
     "timestamp": "2024-02-20T16:00:00Z"
   }
   ```

2. **highValueOrder**
   - Emitted when an order exceeds threshold value
   - Data:
   ```json
   {
     "orderId": "order_id",
     "amount": 10000.00,
     "buyer": {
       "_id": "user_id",
       "name": "John Doe"
     },
     "seller": {
       "_id": "seller_id",
       "name": "Fresh Farms"
     },
     "timestamp": "2024-02-20T16:00:00Z"
   }
   ```

3. **fraudAlert**
   - Emitted when suspicious activity is detected
   - Data:
   ```json
   {
     "type": "multiple_account",
     "severity": "high",
     "details": {
       "userId": "user_id",
       "activity": "Multiple accounts with same phone number",
       "relatedAccounts": ["user_id1", "user_id2"]
     },
     "timestamp": "2024-02-20T16:00:00Z"
   }
   ```

### Notes
1. All financial data is in INR
2. Analytics can be filtered by date range and grouped by period
3. Revenue reports include platform fees and taxes
4. User verification requires document checks
5. Real-time alerts for high-value transactions
6. Fraud detection system monitors suspicious activities
7. Performance metrics track seller growth and customer retention
8. Location-based analytics available for regional insights

## Rewards APIs

### Generate Referral Code
- **Endpoint**: `GET /api/rewards/referral/code`
- **Authentication**: Required
- **Response (200)**:
```json
{
  "referralCode": "JOHN2024",
  "shareLinks": {
    "whatsapp": "https://wa.me/?text=Use%20my%20referral%20code%20JOHN2024",
    "facebook": "https://www.facebook.com/sharer/sharer.php?u=...",
    "twitter": "https://twitter.com/intent/tweet?text=..."
  },
  "rewards": {
    "referrer": {
      "points": 500,
      "cashback": 200
    },
    "referee": {
      "points": 500,
      "discount": {
        "percentage": 10,
        "maxAmount": 100
      }
    }
  }
}
```

### Apply Referral Code
- **Endpoint**: `POST /api/rewards/referral/apply`
- **Authentication**: Required
- **Request Body**:
```json
{
  "referralCode": "JOHN2024"
}
```
- **Response (200)**:
```json
{
  "message": "Referral code applied successfully",
  "rewards": {
    "points": 500,
    "discount": {
      "percentage": 10,
      "maxAmount": 100
    }
  },
  "referrer": {
    "name": "John Doe",
    "points": 500,
    "cashback": 200
  }
}
```

### Get Referral Stats
- **Endpoint**: `GET /api/rewards/referral/stats`
- **Authentication**: Required
- **Response (200)**:
```json
{
  "referralCode": "JOHN2024",
  "referredBy": {
    "_id": "user_id",
    "name": "Jane Smith",
    "joinedAt": "2024-01-15T10:00:00Z"
  },
  "stats": {
    "totalReferrals": 5,
    "activeReferrals": 4,
    "totalEarnings": {
      "points": 2500,
      "cashback": 1000
    },
    "monthlyStats": [
      {
        "month": "2024-02",
        "referrals": 2,
        "earnings": {
          "points": 1000,
          "cashback": 400
        }
      }
    ]
  },
  "referredUsers": [
    {
      "_id": "user_id",
      "name": "Alice Johnson",
      "joinedAt": "2024-02-15T14:30:00Z",
      "status": "active",
      "orders": 3,
      "earnings": {
        "points": 500,
        "cashback": 200
      }
    }
  ],
  "rewardHistory": [
    {
      "type": "referral_bonus",
      "amount": 200,
      "points": 500,
      "user": {
        "_id": "user_id",
        "name": "Alice Johnson"
      },
      "status": "credited",
      "timestamp": "2024-02-15T14:30:00Z"
    }
  ]
}
```

### Get Loyalty Status
- **Endpoint**: `GET /api/rewards/loyalty/status`
- **Authentication**: Required
- **Query Parameters**:
  - `includeHistory`: Include points history (true/false)
  - `startDate`: Filter history from date (YYYY-MM-DD)
  - `endDate`: Filter history to date (YYYY-MM-DD)
  - `page`: Page number for points history (default: 1)
  - `limit`: Items per page (default: 10)
- **Response (200)**:
```json
{
  "currentStatus": {
    "points": 2500,
    "tier": {
      "name": "silver",
      "icon": "tier_icon_url",
      "benefits": [
        "Free delivery on all orders",
        "Priority customer support",
        "Early access to deals"
      ]
    }
  },
  "tierProgress": {
    "current": "silver",
    "next": "gold",
    "pointsToNextTier": 2500,
    "progress": 50
  },
  "pointsSummary": {
    "lifetime": 3500,
    "available": 2500,
    "redeemed": 1000,
    "expired": 0,
    "pending": 200
  },
  "monthlyActivity": {
    "earned": 800,
    "redeemed": 200,
    "expiringNext": 0
  },
  "benefits": {
    "active": [
      {
        "type": "free_delivery",
        "description": "Free delivery on all orders",
        "validUntil": "2024-03-20T00:00:00Z"
      }
    ],
    "available": [
      {
        "type": "birthday_bonus",
        "description": "2X points on birthday",
        "unlocksAt": 5000
      }
    ]
  },
  "pointsHistory": [
    {
      "type": "earned",
      "source": "purchase",
      "orderId": "order_id",
      "points": 100,
      "description": "Points earned for order #123",
      "metadata": {
        "orderAmount": 1000,
        "multiplier": 1
      },
      "status": "credited",
      "timestamp": "2024-02-20T10:30:00Z"
    },
    {
      "type": "redeemed",
      "source": "cashback",
      "points": 1000,
      "amount": 100,
      "description": "Redeemed for ₹100 cashback",
      "status": "completed",
      "timestamp": "2024-02-19T15:45:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "totalPages": 5,
    "hasMore": true
  }
}
```

### Redeem Points
- **Endpoint**: `POST /api/rewards/loyalty/redeem`
- **Authentication**: Required
- **Request Body**:
```json
{
  "points": 1000,
  "redeemType": "cashback",
  "orderId": "order_id" // Optional: Apply to specific order
}
```
- **Response (200)**:
```json
{
  "message": "Points redeemed successfully",
  "redemption": {
    "id": "redemption_id",
    "points": 1000,
    "type": "cashback",
    "value": {
      "amount": 100,
      "currency": "INR"
    },
    "status": "completed",
    "timestamp": "2024-02-20T16:00:00Z"
  },
  "remainingPoints": 1500,
  "cashbackDetails": {
    "amount": 100,
    "status": "processing",
    "estimatedCreditDate": "2024-02-21T16:00:00Z"
  }
}
```

### Get Available Rewards
- **Endpoint**: `GET /api/rewards/available`
- **Authentication**: Required
- **Response (200)**:
```json
{
  "points": 2500,
  "rewards": [
    {
      "id": "reward_id",
      "type": "cashback",
      "title": "₹100 Cashback",
      "description": "Redeem 1000 points for ₹100 cashback",
      "points": 1000,
      "value": {
        "amount": 100,
        "type": "cashback"
      },
      "terms": [
        "Minimum order value: ₹500",
        "Valid for 30 days"
      ],
      "isAvailable": true
    },
    {
      "id": "reward_id2",
      "type": "discount",
      "title": "15% Off",
      "description": "Get 15% off on your next order",
      "points": 2000,
      "value": {
        "percentage": 15,
        "maxAmount": 200
      },
      "terms": [
        "Maximum discount: ₹200",
        "Valid for 15 days"
      ],
      "isAvailable": true
    }
  ],
  "specialOffers": [
    {
      "id": "offer_id",
      "title": "Birthday Month Special",
      "description": "2X points on all purchases",
      "validFrom": "2024-03-01T00:00:00Z",
      "validUntil": "2024-03-31T23:59:59Z",
      "terms": [
        "Valid only during birthday month",
        "Maximum bonus points: 1000"
      ]
    }
  ]
}
```

### Real-time Events
The following Socket.IO events are available for rewards updates:

1. **pointsEarned**
   - Emitted when points are credited
   - Data:
   ```json
   {
     "type": "earned",
     "points": 100,
     "source": {
       "type": "purchase",
       "orderId": "order_id"
     },
     "newBalance": 2600,
     "timestamp": "2024-02-20T16:00:00Z"
   }
   ```

2. **tierUpdate**
   - Emitted when user's tier changes
   - Data:
   ```json
   {
     "previousTier": "silver",
     "newTier": "gold",
     "unlockedBenefits": [
       {
         "type": "priority_support",
         "description": "Priority customer support"
       }
     ],
     "timestamp": "2024-02-20T16:00:00Z"
   }
   ```

3. **rewardExpiry**
   - Emitted when points are about to expire
   - Data:
   ```json
   {
     "points": 500,
     "expiryDate": "2024-03-20T00:00:00Z",
     "daysRemaining": 30
   }
   ```

### Error Responses
- **400 Bad Request**:
```json
{
  "error": "Invalid redemption request",
  "details": "Insufficient points balance"
}
```
- **401 Unauthorized**:
```json
{
  "error": "Authentication required"
}
```
- **403 Forbidden**:
```json
{
  "error": "Redemption not allowed",
  "details": "Minimum points requirement not met"
}
```
- **404 Not Found**:
```json
{
  "error": "Reward not found"
}
```
- **409 Conflict**:
```json
{
  "error": "Referral code already used",
  "details": "Each user can use only one referral code"
}
```

### Notes
1. Referral rewards are credited after referee's first order
2. Points expire after 12 months from earning date
3. Tier benefits are valid for the entire tier period
4. Cashback redemption processed within 24 hours
5. Birthday rewards are automatically activated
6. Points earning rate: 1 point per ₹1 spent
7. Minimum redemption: 1000 points
8. Maximum referral rewards per month: 10

### Loyalty Tiers
- **Bronze**: 0-1,999 points
  - Benefits:
    - Earn 1 point per ₹1
    - Standard delivery
    - Email support
- **Silver**: 2,000-4,999 points
  - Benefits:
    - Earn 1.2 points per ₹1
    - Free delivery
    - Priority email support
    - Early access to deals
- **Gold**: 5,000-9,999 points
  - Benefits:
    - Earn 1.5 points per ₹1
    - Free priority delivery
    - Priority phone support
    - Exclusive deals
    - Birthday bonus points
- **Platinum**: 10,000+ points
  - Benefits:
    - Earn 2 points per ₹1
    - Free express delivery
    - Dedicated support
    - VIP access to sales
    - Monthly bonus points
    - Special event invites

## Support APIs

### Create Support Ticket
- **Endpoint**: `POST /api/support/tickets`
- **Authentication**: Required
- **Request Body**:
```json
{
  "subject": "Order Delivery Issue",
  "description": "Order #123 has not been delivered yet. It's been 2 days past the estimated delivery date.",
  "category": "delivery",
  "priority": "high",
  "orderId": "order_123", // Optional: Link to specific order
  "attachments": ["base64_image_data"] // Optional: Add supporting images
}
```
- **Response (201)**:
```json
{
  "message": "Support ticket created successfully",
  "ticket": {
    "ticketId": "TKT-2024-001",
    "subject": "Order Delivery Issue",
    "description": "Order #123 has not been delivered yet. It's been 2 days past the estimated delivery date.",
    "category": "delivery",
    "priority": "high",
    "status": "open",
    "order": {
      "_id": "order_123",
      "items": [
        {
          "name": "Fresh Tomatoes",
          "quantity": 2,
          "unit": "kg"
        }
      ],
      "expectedDelivery": "2024-02-18T10:00:00Z"
    },
    "attachments": [
      {
        "url": "image_url",
        "type": "image/jpeg",
        "uploadedAt": "2024-02-20T10:30:00Z"
      }
    ],
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "1234567890"
    },
    "createdAt": "2024-02-20T10:30:00Z",
    "updatedAt": "2024-02-20T10:30:00Z",
    "estimatedResponse": "2024-02-20T12:30:00Z"
  }
}
```

### Update Ticket Status
- **Endpoint**: `PUT /api/support/tickets/:ticketId/status`
- **Authentication**: Required (Admin only)
- **Request Body**:
```json
{
  "status": "in-progress",
  "assignedTo": "admin_id",
  "internalNotes": "Contacted delivery partner for update",
  "priority": "high",
  "estimatedResolution": "2024-02-20T18:00:00Z"
}
```
- **Response (200)**:
```json
{
  "message": "Ticket status updated successfully",
  "ticket": {
    "ticketId": "TKT-2024-001",
    "status": "in-progress",
    "previousStatus": "open",
    "assignedTo": {
      "_id": "admin_id",
      "name": "Support Agent",
      "email": "agent@example.com",
      "department": "delivery"
    },
    "statusHistory": [
      {
        "status": "in-progress",
        "updatedBy": "admin_id",
        "notes": "Contacted delivery partner for update",
        "timestamp": "2024-02-20T11:30:00Z"
      },
      {
        "status": "open",
        "updatedBy": "system",
        "timestamp": "2024-02-20T10:30:00Z"
      }
    ],
    "priority": "high",
    "estimatedResolution": "2024-02-20T18:00:00Z",
    "updatedAt": "2024-02-20T11:30:00Z"
  },
  "notifications": {
    "email": true,
    "sms": false,
    "push": true
  }
}
```

### Add Message to Ticket
- **Endpoint**: `POST /api/support/tickets/:ticketId/messages`
- **Authentication**: Required
- **Request Body**:
```json
{
  "message": "Could you please provide an update on the delivery status?",
  "attachments": ["base64_image_data"],
  "isInternal": false
}
```
- **Response (200)**:
```json
{
  "message": "Message added successfully",
  "ticketMessage": {
    "_id": "message_id",
    "sender": {
      "_id": "user_id",
      "name": "John Doe",
      "role": "consumer"
    },
    "message": "Could you please provide an update on the delivery status?",
    "attachments": [
      {
        "url": "image_url",
        "type": "image/jpeg",
        "uploadedAt": "2024-02-20T12:30:00Z"
      }
    ],
    "isInternal": false,
    "createdAt": "2024-02-20T12:30:00Z",
    "readBy": [
      {
        "userId": "admin_id",
        "timestamp": "2024-02-20T12:31:00Z"
      }
    ]
  },
  "ticket": {
    "ticketId": "TKT-2024-001",
    "status": "in-progress",
    "lastActivity": "2024-02-20T12:30:00Z"
  }
}
```

### Get Ticket Details
- **Endpoint**: `GET /api/support/tickets/:ticketId`
- **Authentication**: Required (Ticket owner or Admin)
- **Response (200)**:
```json
{
  "ticket": {
    "ticketId": "TKT-2024-001",
    "subject": "Order Delivery Issue",
    "description": "Order #123 has not been delivered yet. It's been 2 days past the estimated delivery date.",
    "category": "delivery",
    "priority": "high",
    "status": "in-progress",
    "assignedTo": {
      "_id": "admin_id",
      "name": "Support Agent",
      "email": "agent@example.com",
      "department": "delivery"
    },
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "1234567890"
    },
    "order": {
      "_id": "order_123",
      "status": "in-transit",
      "items": [
        {
          "name": "Fresh Tomatoes",
          "quantity": 2,
          "unit": "kg"
        }
      ],
      "expectedDelivery": "2024-02-18T10:00:00Z",
      "currentLocation": {
        "status": "In transit",
        "location": "Mumbai Hub",
        "timestamp": "2024-02-20T10:00:00Z"
      }
    },
    "messages": [
      {
        "_id": "message_id1",
        "sender": {
          "_id": "user_id",
          "name": "John Doe",
          "role": "consumer"
        },
        "message": "Could you please provide an update on the delivery status?",
        "attachments": [
          {
            "url": "image_url",
            "type": "image/jpeg"
          }
        ],
        "isInternal": false,
        "createdAt": "2024-02-20T12:30:00Z"
      },
      {
        "_id": "message_id2",
        "sender": {
          "_id": "admin_id",
          "name": "Support Agent",
          "role": "admin"
        },
        "message": "I've checked with the delivery partner. The order is currently at Mumbai Hub and will be delivered by today evening.",
        "isInternal": false,
        "createdAt": "2024-02-20T12:45:00Z"
      }
    ],
    "statusHistory": [
      {
        "status": "in-progress",
        "updatedBy": {
          "_id": "admin_id",
          "name": "Support Agent"
        },
        "notes": "Contacted delivery partner for update",
        "timestamp": "2024-02-20T11:30:00Z"
      }
    ],
    "metadata": {
      "platform": "web",
      "browser": "Chrome",
      "priority": "high",
      "escalated": false
    },
    "sla": {
      "responseTime": "2 hours",
      "resolutionTime": "24 hours",
      "breached": false
    },
    "createdAt": "2024-02-20T10:30:00Z",
    "updatedAt": "2024-02-20T12:45:00Z",
    "estimatedResolution": "2024-02-20T18:00:00Z"
  }
}
```

### Get All Tickets
- **Endpoint**: `GET /api/support/tickets`
- **Authentication**: Required
- **Query Parameters**:
  - `status`: Filter by status (open/in-progress/resolved/closed)
  - `priority`: Filter by priority (low/medium/high)
  - `category`: Filter by category
  - `assignedTo`: Filter by assigned agent
  - `startDate`: Filter by start date
  - `endDate`: Filter by end date
  - `search`: Search in subject/description
  - `sort`: Sort field (created/updated/priority)
  - `order`: Sort order (asc/desc)
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Response (200)**:
```json
{
  "tickets": [
    {
      "ticketId": "TKT-2024-001",
      "subject": "Order Delivery Issue",
      "category": "delivery",
      "priority": "high",
      "status": "in-progress",
      "user": {
        "_id": "user_id",
        "name": "John Doe"
      },
      "assignedTo": {
        "_id": "admin_id",
        "name": "Support Agent"
      },
      "lastMessage": {
        "sender": "Support Agent",
        "message": "I've checked with the delivery partner...",
        "timestamp": "2024-02-20T12:45:00Z"
      },
      "metadata": {
        "order": "order_123",
        "escalated": false
      },
      "sla": {
        "breached": false,
        "responseTime": "responded",
        "resolutionTime": "on-track"
      },
      "createdAt": "2024-02-20T10:30:00Z",
      "updatedAt": "2024-02-20T12:45:00Z"
    }
  ],
  "summary": {
    "total": 150,
    "status": {
      "open": 45,
      "in-progress": 35,
      "resolved": 40,
      "closed": 30
    },
    "priority": {
      "high": 25,
      "medium": 75,
      "low": 50
    },
    "sla": {
      "breached": 5,
      "at-risk": 10,
      "on-track": 135
    },
    "categories": {
      "delivery": 50,
      "product": 40,
      "payment": 30,
      "other": 30
    },
    "responseTime": {
      "average": "1.5 hours",
      "within-sla": "95%"
    }
  },
  "pagination": {
    "page": 1,
    "totalPages": 15,
    "hasMore": true
  }
}
```

### Real-time Events
The following Socket.IO events are available for support ticket updates:

1. **newTicket**
   - Emitted when a new ticket is created
   - Data:
   ```json
   {
     "ticketId": "TKT-2024-001",
     "subject": "Order Delivery Issue",
     "priority": "high",
     "user": {
       "_id": "user_id",
       "name": "John Doe"
     },
     "category": "delivery",
     "timestamp": "2024-02-20T10:30:00Z"
   }
   ```

2. **ticketAssigned**
   - Emitted when a ticket is assigned to an agent
   - Data:
   ```json
   {
     "ticketId": "TKT-2024-001",
     "assignedTo": {
       "_id": "admin_id",
       "name": "Support Agent",
       "department": "delivery"
     },
     "priority": "high",
     "timestamp": "2024-02-20T11:30:00Z"
   }
   ```

3. **newTicketMessage**
   - Emitted when a new message is added to a ticket
   - Data:
   ```json
   {
     "ticketId": "TKT-2024-001",
     "message": {
       "sender": {
         "_id": "user_id",
         "name": "John Doe",
         "role": "consumer"
       },
       "content": "Could you please provide an update?",
       "hasAttachments": true,
       "timestamp": "2024-02-20T12:30:00Z"
     }
   }
   ```

4. **ticketStatusUpdate**
   - Emitted when ticket status changes
   - Data:
   ```json
   {
     "ticketId": "TKT-2024-001",
     "previousStatus": "open",
     "newStatus": "in-progress",
     "updatedBy": {
       "_id": "admin_id",
       "name": "Support Agent"
     },
     "timestamp": "2024-02-20T11:30:00Z"
   }
   ```

5. **slaAlert**
   - Emitted when a ticket approaches or breaches SLA
   - Data:
   ```json
   {
     "ticketId": "TKT-2024-001",
     "type": "resolution_warning",
     "timeRemaining": "30 minutes",
     "priority": "high",
     "timestamp": "2024-02-20T17:30:00Z"
   }
   ```

### Error Responses
- **400 Bad Request**:
```json
{
  "error": "Invalid ticket data",
  "details": "Subject and description are required"
}
```
- **401 Unauthorized**:
```json
{
  "error": "Authentication required"
}
```
- **403 Forbidden**:
```json
{
  "error": "Access denied",
  "details": "Only admins can update ticket status"
}
```
- **404 Not Found**:
```json
{
  "error": "Ticket not found",
  "details": "The specified ticket does not exist"
}
```
- **422 Unprocessable Entity**:
```json
{
  "error": "Invalid status transition",
  "details": "Cannot transition from 'closed' to 'open'"
}
```

### Notes
1. Ticket priority affects SLA timelines:
   - High: 2 hours response, 24 hours resolution
   - Medium: 4 hours response, 48 hours resolution
   - Low: 8 hours response, 72 hours resolution
2. File attachments supported:
   - Images (jpg, png, gif)
   - Documents (pdf, doc, docx)
   - Max size: 5MB per file
3. Internal notes visible only to support staff
4. Automatic ticket assignment based on:
   - Category
   - Agent workload
   - Business hours
5. SLA tracking considers:
   - Business hours (9 AM - 6 PM)
   - Holidays
   - Ticket priority
6. Real-time notifications via:
   - Email
   - SMS (high priority)
   - Push notifications
7. Ticket categories:
   - Delivery
   - Product
   - Payment
   - Account
   - Technical
   - Other
8. Status flow:
   - Open → In Progress → Resolved → Closed
   - Can be reopened within 7 days of closing

## Bulk Order APIs

### Create Bulk Order
- **Endpoint**: `POST /api/bulk/orders`
- **Authentication**: Required (Consumer only)
- **Request Body**:
```json
{
  "items": [
    {
      "product": "product_id",
      "quantity": 50
    }
  ],
  "deliveryAddress": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "coordinates": {
      "coordinates": [72.8777, 19.0760]
    }
  },
  "paymentMethod": "razorpay",
  "deliveryDate": "2024-03-20"
}
```
- **Response (201)**:
```json
{
  "message": "Bulk orders created successfully",
  "orders": [
    {
      "_id": "order_id",
      "buyer": "user_id",
      "seller": "seller_id",
      "items": [
        {
          "product": {
            "_id": "product_id",
            "name": "Fresh Tomatoes",
            "images": [{"url": "image_url"}]
          },
          "quantity": 50,
          "price": 40,
          "unit": "kg"
        }
      ],
      "totalAmount": 2000,
      "status": "pending",
      "paymentStatus": "pending",
      "orderType": "bulk",
      "expectedDeliveryDate": "2024-03-20",
      "deliveryAddress": {
        "street": "123 Main St",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "coordinates": {
          "type": "Point",
          "coordinates": [72.8777, 19.0760]
        }
      }
    }
  ],
  "orderIds": ["order_id1", "order_id2"],
  "razorpayOrder": {
    "id": "razorpay_order_id",
    "amount": 200000,
    "currency": "INR"
  }
}
```

### Get Bulk Orders
- **Endpoint**: `GET /api/bulk/orders`
- **Authentication**: Required
- **Query Parameters**:
  - `role`: Filter by role (buyer/seller)
  - `status`: Filter by order status
  - `startDate`: Filter by start date (YYYY-MM-DD)
  - `endDate`: Filter by end date (YYYY-MM-DD)
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Response (200)**:
```json
{
  "orders": [
    {
      "_id": "order_id",
      "buyer": {
        "_id": "user_id",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "1234567890"
      },
      "seller": {
        "_id": "seller_id",
        "name": "Vendor Name",
        "email": "vendor@example.com",
        "phone": "9876543210"
      },
      "items": [
        {
          "product": {
            "_id": "product_id",
            "name": "Fresh Tomatoes",
            "images": [{"url": "image_url"}]
          },
          "quantity": 50,
          "price": 40,
          "unit": "kg"
        }
      ],
      "totalAmount": 2000,
      "status": "pending",
      "orderType": "bulk",
      "expectedDeliveryDate": "2024-03-20",
      "createdAt": "2024-02-20T10:30:00Z",
      "updatedAt": "2024-02-20T10:30:00Z"
    }
  ],
  "page": 1,
  "totalPages": 5,
  "total": 50
}
```

### Update Bulk Order Status
- **Endpoint**: `PUT /api/bulk/orders/:id/status`
- **Authentication**: Required (Vendor/Farmer only)
- **Request Body**:
```json
{
  "status": "accepted"
}
```
- **Response (200)**:
```json
{
  "message": "Bulk order status updated successfully",
  "order": {
    "_id": "order_id",
    "status": "accepted",
    "items": [
      {
        "product": {
          "_id": "product_id",
          "name": "Fresh Tomatoes"
        },
        "quantity": 50,
        "price": 40,
        "unit": "kg"
      }
    ],
    "totalAmount": 2000,
    "updatedAt": "2024-02-20T10:35:00Z"
  },
  "pointsEarned": 2000
}
```

### Get Bulk Order Analytics
- **Endpoint**: `GET /api/bulk/analytics`
- **Authentication**: Required
- **Query Parameters**:
  - `startDate`: Start date for analytics (YYYY-MM-DD)
  - `endDate`: End date for analytics (YYYY-MM-DD)
- **Response (200)**:
```json
{
  "analytics": [
    {
      "_id": {
        "year": 2024,
        "month": 2
      },
      "totalOrders": 10,
      "totalQuantity": 500,
      "totalAmount": 20000,
      "averageOrderValue": 2000,
      "products": [
        {
          "productId": "product_id",
          "name": "Fresh Tomatoes",
          "totalQuantity": 300,
          "totalAmount": 12000
        }
      ]
    }
  ],
  "summary": {
    "totalOrders": 50,
    "totalQuantity": 2500,
    "totalAmount": 100000,
    "averageOrderValue": 2000,
    "topProducts": [
      {
        "productId": "product_id",
        "name": "Fresh Tomatoes",
        "totalQuantity": 1500,
        "totalAmount": 60000
      }
    ]
  }
}
```

### Error Responses
- **400 Bad Request**:
```json
{
  "error": "Invalid request parameters",
  "details": "Delivery date must be at least 24 hours in advance"
}
```
- **401 Unauthorized**:
```json
{
  "error": "Authentication required"
}
```
- **403 Forbidden**:
```json
{
  "error": "Insufficient permissions to update bulk order status"
}
```
- **404 Not Found**:
```json
{
  "error": "Bulk order not found"
}
```

### Real-time Events
The following Socket.IO events are available for bulk order updates:

1. **newBulkOrder**
   - Emitted when a new bulk order is created
   - Data:
   ```json
   {
     "orderId": "order_id",
     "seller": {
       "_id": "seller_id",
       "name": "Vendor Name"
     },
     "isBulk": true,
     "totalAmount": 2000,
     "items": [
       {
         "product": "product_id",
         "quantity": 50
       }
     ]
   }
   ```

2. **bulkOrderStatusUpdate**
   - Emitted when bulk order status is updated
   - Data:
   ```json
   {
     "orderId": "order_id",
     "status": "accepted",
     "buyer": {
       "_id": "user_id",
       "name": "John Doe"
     },
     "pointsEarned": 2000
   }
   ```

Example Socket.IO client setup for bulk orders:
```javascript
const socket = io('http://your-api-url');

// Authenticate after connecting
socket.on('connect', () => {
  socket.emit('authenticate', userId);
});

// Listen for bulk order events
socket.on('newBulkOrder', (data) => {
  console.log('New bulk order:', data);
});

socket.on('bulkOrderStatusUpdate', (data) => {
  console.log('Bulk order status updated:', data);
  if (data.pointsEarned) {
    console.log(`Earned ${data.pointsEarned} points for bulk order`);
  }
});
```

## Inventory Alert APIs

### Set Alert Thresholds
- **Endpoint**: `PUT /api/inventory/alerts/:productId/thresholds`
- **Authentication**: Required (Farmer/Vendor only)
- **Request Body**:
```json
{
  "lowStock": 15,
  "criticalStock": 5
}
```
- **Response (200)**:
```json
{
  "message": "Alert thresholds updated successfully",
  "product": {
    "_id": "product_id",
    "name": "Fresh Tomatoes",
    "stock": 20,
    "unit": "kg",
    "category": "vegetables",
    "stockAlerts": {
      "lowStock": 15,
      "criticalStock": 5,
      "enabled": true
    },
    "updatedAt": "2024-02-20T10:30:00Z"
  }
}
```

### Get Inventory Alerts
- **Endpoint**: `GET /api/inventory/alerts`
- **Authentication**: Required (Farmer/Vendor only)
- **Query Parameters**:
  - `status`: Filter by alert status (critical/low)
  - `category`: Filter by product category
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Response (200)**:
```json
{
  "alerts": [
    {
      "_id": "product_id",
      "name": "Fresh Tomatoes",
      "stock": 3,
      "unit": "kg",
      "category": "vegetables",
      "image": {
        "url": "image_url",
        "public_id": "cloudinary_public_id"
      },
      "thresholds": {
        "lowStock": 15,
        "criticalStock": 5
      },
      "status": "critical",
      "lastUpdated": "2024-02-20T10:30:00Z"
    },
    {
      "_id": "product_id2",
      "name": "Potatoes",
      "stock": 12,
      "unit": "kg",
      "category": "vegetables",
      "image": {
        "url": "image_url",
        "public_id": "cloudinary_public_id"
      },
      "thresholds": {
        "lowStock": 20,
        "criticalStock": 8
      },
      "status": "low",
      "lastUpdated": "2024-02-20T10:30:00Z"
    }
  ],
  "summary": {
    "total": 5,
    "critical": 2,
    "low": 3,
    "categories": {
      "vegetables": {
        "critical": 1,
        "low": 2
      },
      "fruits": {
        "critical": 1,
        "low": 1
      }
    }
  },
  "page": 1,
  "totalPages": 1
}
```

### Toggle Alerts
- **Endpoint**: `PUT /api/inventory/alerts/:productId/toggle`
- **Authentication**: Required (Farmer/Vendor only)
- **Request Body**:
```json
{
  "enabled": true
}
```
- **Response (200)**:
```json
{
  "message": "Inventory alerts enabled successfully",
  "product": {
    "_id": "product_id",
    "name": "Fresh Tomatoes",
    "alertsEnabled": true,
    "stockAlerts": {
      "lowStock": 15,
      "criticalStock": 5,
      "enabled": true
    }
  }
}
```

### Get Alert Settings
- **Endpoint**: `GET /api/inventory/alerts/:productId/settings`
- **Authentication**: Required (Farmer/Vendor only)
- **Response (200)**:
```json
{
  "product": {
    "_id": "product_id",
    "name": "Fresh Tomatoes",
    "stock": 20,
    "unit": "kg",
    "category": "vegetables",
    "alertsEnabled": true,
    "thresholds": {
      "lowStock": 15,
      "criticalStock": 5
    },
    "notificationSettings": {
      "email": true,
      "push": true,
      "sms": false
    },
    "alertHistory": [
      {
        "type": "low",
        "stock": 14,
        "timestamp": "2024-02-19T15:30:00Z"
      },
      {
        "type": "critical",
        "stock": 4,
        "timestamp": "2024-02-18T09:15:00Z"
      }
    ]
  }
}
```

### Error Responses
- **400 Bad Request**:
```json
{
  "error": "Invalid threshold values",
  "details": "Critical stock threshold must be less than low stock threshold"
}
```
- **401 Unauthorized**:
```json
{
  "error": "Authentication required"
}
```
- **403 Forbidden**:
```json
{
  "error": "Insufficient permissions to manage inventory alerts"
}
```
- **404 Not Found**:
```json
{
  "error": "Product not found"
}
```

### Real-time Events
The following Socket.IO events are available for inventory alerts:

1. **inventoryAlert**
   - Emitted when a product's stock reaches low or critical levels
   - Data:
   ```json
   {
     "productId": "product_id",
     "name": "Fresh Tomatoes",
     "stock": 4,
     "type": "critical",
     "thresholds": {
       "lowStock": 15,
       "criticalStock": 5
     },
     "timestamp": "2024-02-20T10:30:00Z"
   }
   ```

2. **stockUpdate**
   - Emitted when product stock is updated
   - Data:
   ```json
   {
     "productId": "product_id",
     "name": "Fresh Tomatoes",
     "previousStock": 20,
     "currentStock": 14,
     "status": "low",
     "timestamp": "2024-02-20T10:30:00Z"
   }
   ```

Example Socket.IO client setup for inventory alerts:
```javascript
const socket = io('http://your-api-url');

// Authenticate after connecting
socket.on('connect', () => {
  socket.emit('authenticate', userId);
});

// Listen for inventory alerts
socket.on('inventoryAlert', (data) => {
  console.log(`${data.name} stock is ${data.type}:`, data.stock);
});

socket.on('stockUpdate', (data) => {
  console.log(`${data.name} stock updated:`, {
    previous: data.previousStock,
    current: data.currentStock,
    status: data.status
  });
});
```

### Default Thresholds
- Low Stock: 10 units
- Critical Stock: 5 units

### Notes
1. Stock alerts are triggered in real-time when:
   - Stock falls below low stock threshold
   - Stock falls below critical stock threshold
   - Stock is updated and crosses a threshold
2. Alert notifications can be configured for:
   - Email notifications
   - Push notifications (if mobile app is used)
   - SMS notifications (if enabled)
3. Alert history is maintained for auditing and analysis
4. Thresholds can be set per product
5. Alerts can be temporarily disabled per product
6. Summary statistics are provided for quick overview
7. Category-wise alert summaries help in inventory management

## Export APIs

### Export Orders
**Endpoint:** `GET /api/export/orders`  
**Authentication:** Required  
**Description:** Export orders data in CSV or Excel format.

**Query Parameters:**
- `format` (optional): Export format ('csv' or 'excel'). Default: 'csv'
- `startDate` (optional): Filter orders from this date (YYYY-MM-DD)
- `endDate` (optional): Filter orders until this date (YYYY-MM-DD)
- `status` (optional): Filter by order status

**Response Headers:**
For CSV:
```
Content-Type: text/csv
Content-Disposition: attachment; filename=orders_2024-02-20.csv
```

For Excel:
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename=orders_2024-02-20.xlsx
```

**CSV/Excel Content Format:**
```
OrderID,Date,Buyer,BuyerEmail,BuyerPhone,Seller,SellerEmail,SellerPhone,Items,TotalAmount,Status,PaymentStatus,PaymentMethod,DeliveryAddress
65d4e8a1b3ff,2024-02-20,John Doe,john@example.com,1234567890,Vendor Name,vendor@example.com,9876543210,"Fresh Tomatoes (5 kg); Potatoes (3 kg)",450,delivered,completed,razorpay,"123 Main St, Mumbai, Maharashtra - 400001"
```

### Export Inventory
**Endpoint:** `GET /api/export/inventory`  
**Authentication:** Required (Farmers/Vendors only)  
**Description:** Export inventory data in CSV or Excel format.

**Query Parameters:**
- `format` (optional): Export format ('csv' or 'excel'). Default: 'csv'
- `category` (optional): Filter by product category
- `stockStatus` (optional): Filter by stock status ('low', 'out')

**Response Headers:**
For CSV:
```
Content-Type: text/csv
Content-Disposition: attachment; filename=inventory_2024-02-20.csv
```

For Excel:
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename=inventory_2024-02-20.xlsx
```

**CSV/Excel Content Format:**
```
ProductID,Name,Category,Stock,Unit,Price,Status,LastUpdated
65d4e8a1b3ff,Fresh Tomatoes,vegetables,8,kg,50,Low Stock,2024-02-20
65d4e8a2c4ee,Potatoes,vegetables,0,kg,30,Out of Stock,2024-02-20
65d4e8a3d5ff,Onions,vegetables,25,kg,40,In Stock,2024-02-20
```

### Export Sales Analytics
**Endpoint:** `GET /api/export/analytics`  
**Authentication:** Required  
**Description:** Export sales analytics data in CSV or Excel format.

**Query Parameters:**
- `format` (optional): Export format ('csv' or 'excel'). Default: 'csv'
- `startDate` (optional): Start date for analytics (YYYY-MM-DD)
- `endDate` (optional): End date for analytics (YYYY-MM-DD)
- `groupBy` (optional): Group data by ('day', 'week', 'month'). Default: 'day'

**Response Headers:**
For CSV:
```
Content-Type: text/csv
Content-Disposition: attachment; filename=sales_analytics_2024-02-20.csv
```

For Excel:
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename=sales_analytics_2024-02-20.xlsx
```

**CSV Content Format:**
```
Period,TotalOrders,TotalRevenue,AverageOrderValue
2024-02-18,25,12500.00,500.00
2024-02-19,30,15000.00,500.00
2024-02-20,28,14000.00,500.00
```

**Excel Format:**
The Excel format includes the same data as CSV but with additional features:
- Styled header row with gray background
- Bold headers
- Auto-adjusted column widths
- Summary row at the bottom with totals and averages:
```
Period,TotalOrders,TotalRevenue,AverageOrderValue
2024-02-18,25,12500.00,500.00
2024-02-19,30,15000.00,500.00
2024-02-20,28,14000.00,500.00
Total,83,41500.00,500.00
```

**Error Responses:**
```json
{
  "message": "Invalid export format"
}
```
```json
{
  "message": "Error exporting orders"
}
```

**Notes:**
1. All exports are provided as downloadable files
2. Excel exports include additional styling and formatting
3. Date ranges are inclusive of start and end dates
4. For inventory exports, stock status thresholds are:
   - Out of Stock: 0 units
   - Low Stock: ≤ 10 units
   - In Stock: > 10 units
5. Sales analytics can be grouped by day, week, or month
6. All monetary values are in INR and formatted to 2 decimal places
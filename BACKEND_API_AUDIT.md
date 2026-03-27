# Rejoes POS Backend API Audit - Complete Endpoint Documentation

## Overview

This document provides a comprehensive audit of all backend endpoints for the Rejoes admin frontend integration. The API is built with Express.js, uses PostgreSQL with Prisma ORM, and includes file upload functionality with Cloudflare R2 storage.

## Base Configuration

- **Base URL**: `http://localhost:3000` (development)
- **API Routes**: All endpoints prefixed with `/api/`
- **Documentation**: Available at `/docs` (Swagger UI)
- **CORS**: Currently allows all origins (`*`) - **SECURITY CONCERN FOR PRODUCTION**

## Authentication & Security

### Current Status
- **No authentication required** for any endpoints
- **Idempotency middleware** applied to POST requests (except uploads and webhooks)
- **Required header**: `x-idempotency-key` for POST requests (except uploads)

### Idempotency Requirements
```javascript
// Required for all POST requests except uploads and webhooks
Headers: {
  "x-idempotency-key": "unique-identifier-for-request"
}
```

### CORS Configuration
```javascript
// Current (development) configuration
origin: '*'
methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
allowedHeaders: '*'
credentials: true
```

**⚠️ PRODUCTION WARNING**: CORS allows all origins. This should be restricted to specific Shopify app domains.

---

## 1. Member Management Endpoints

### 1.1 Create Member
```
POST /api/members/add
```

**Endpoint Details:**
- **Method**: POST
- **URL**: `/api/members/add`
- **Authentication**: None
- **Rate Limits**: None
- **Idempotency**: Required (`x-idempotency-key` header)

**Request Requirements:**
```javascript
Headers: {
  "Content-Type": "application/json",
  "x-idempotency-key": "unique-request-id"
}

Body: {
  "cardToken": "string (required, trimmed)",
  "tier": "string (optional, default: 'BASIC')", 
  "storeLocation": "string (optional, default: 'Main Store')",
  "shopifyCustomerId": "string (required, trimmed)"
}
```

**Validation Rules:**
- `cardToken`: Required, must be unique, converted to string and trimmed
- `shopifyCustomerId`: Required, must be trimmed
- `tier`: Optional, converted to uppercase, defaults to 'BASIC'
- `storeLocation`: Optional, defaults to 'Main Store'

**Response Format:**
```javascript
Success (201):
{
  "success": true,
  "data": {
    "message": "Member created successfully",
    "member": {
      "id": "cm123abc",
      "cardToken": "member-123",
      "shopifyCustomerId": "gid://shopify/Customer/123",
      "tier": "BASIC|PREMIUM|VIP",
      "status": "ACTIVE",
      "cycleStart": "2023-01-01T00:00:00.000Z",
      "cycleEnd": "2023-02-01T00:00:00.000Z",
      "itemsUsed": 0,
      "swapsUsed": 0,
      "itemsOut": 0,
      "storeLocation": "Main Store"
    }
  }
}

Error (400):
{
  "message": "Card number is required" | "shopifyCustomerId is required" | 
           "This card number is already in use" | "This Shopify customer is already registered"
}
```

**Database Operations:**
- Creates record in `Member` table
- Uses unique constraints on `cardToken` and `shopifyCustomerId`
- Sets initial cycle dates (1 month from creation)

---

### 1.2 Get Member by Card Token
```
GET /api/members/by-card/{cardToken}
```

**Endpoint Details:**
- **Method**: GET
- **URL**: `/api/members/by-card/{cardToken}`
- **Authentication**: None
- **Rate Limits**: None

**Request Requirements:**
```javascript
URL Parameters:
- cardToken: string (required, path parameter)
```

**Response Format:**
```javascript
Success (200):
{
  "success": true,
  "data": {
    "member": {
      // Full member object (same as create response)
    },
    "allowances": {
      // Member tier allowances object
    },
    "activeLoans": [
      // Array of active loan objects
    ]
  }
}

Error (404):
{
  "message": "Member not found"
}
```

**Database Operations:**
- Queries `Member` table by `cardToken`
- Includes related `loans` data
- Calculates member allowances based on tier

---

## 2. Loan Management Endpoints

### 2.1 Create Loan (Checkout)
```
POST /api/loans/checkout
```

**Endpoint Details:**
- **Method**: POST
- **URL**: `/api/loans/checkout`
- **Authentication**: None
- **Rate Limits**: None
- **Idempotency**: Required (`x-idempotency-key` header)

**Request Requirements:**
```javascript
Headers: {
  "Content-Type": "application/json",
  "x-idempotency-key": "unique-request-id"
}

Body: {
  "memberId": "string (required)",
  "storeLocation": "string (required)",
  "uploadIds": ["string"] (required, array of upload IDs)
}
```

**Validation Rules:**
- `memberId`: Required, must exist in database
- `storeLocation`: Required
- `uploadIds`: Required, must be array of valid upload IDs

**Response Format:**
```javascript
Success (201):
{
  "success": true,
  "data": {
    "id": "loan123",
    "memberId": "cm123abc",
    "storeLocation": "Main Store",
    "checkoutAt": "2023-01-01T10:00:00.000Z",
    "dueDate": "2023-01-31T10:00:00.000Z",
    "returnedAt": null,
    "photoUrl": "loans/loan123/photo.jpg",
    "thumbnailUrl": "loans/loan123/thumb.jpg",
    "createdAt": "2023-01-01T10:00:00.000Z"
  }
}

Error (400):
{
  "message": "Missing required fields"
}
```

**Database Operations:**
- Creates record in `Loan` table
- Links uploaded photos via `uploadIds`
- Sets due date to 30 days from checkout
- Updates member's `itemsOut` count

---

### 2.2 Return Loan
```
POST /api/loans/return
```

**Endpoint Details:**
- **Method**: POST
- **URL**: `/api/loans/return`
- **Authentication**: None
- **Rate Limits**: None
- **Idempotency**: Required (`x-idempotency-key` header)

**Request Requirements:**
```javascript
Headers: {
  "Content-Type": "application/json",
  "x-idempotency-key": "unique-request-id"
}

Body: {
  "memberId": "string (required)",
  "loanId": "string (required)"
}
```

**Response Format:**
```javascript
Success (200):
{
  "success": true,
  "data": {
    "id": "loan123",
    "memberId": "cm123abc",
    "storeLocation": "Main Store",
    "checkoutAt": "2023-01-01T10:00:00.000Z",
    "dueDate": "2023-01-31T10:00:00.000Z",
    "returnedAt": "2023-01-15T10:00:00.000Z",
    "photoUrl": "loans/loan123/photo.jpg",
    "thumbnailUrl": "loans/loan123/thumb.jpg",
    "createdAt": "2023-01-01T10:00:00.000Z"
  }
}

Error (400/404):
{
  "message": "Missing required fields" | "Loan not found"
}
```

**Database Operations:**
- Updates `Loan` record with `returnedAt` timestamp
- Updates member's `itemsOut` count
- Records audit event

---

### 2.3 Swap Loan
```
POST /api/loans/swap
```

**Endpoint Details:**
- **Method**: POST
- **URL**: `/api/loans/swap`
- **Authentication**: None
- **Rate Limits**: None
- **Idempotency**: Required (`x-idempotency-key` header)

**Request Requirements:**
```javascript
Headers: {
  "Content-Type": "application/json",
  "x-idempotency-key": "unique-request-id"
}

Body: {
  "memberId": "string (required)",
  "loanId": "string (required)",
  "storeLocation": "string (required)",
  "uploadIds": ["string"] (required, array)
}
```

**Response Format:**
```javascript
Success (200):
{
  "success": true,
  "data": {
    "returnedLoan": {
      "id": "loan123",
      "memberId": "cm123abc",
      "returnedAt": "2023-01-15T10:00:00.000Z"
    },
    "newLoan": {
      "id": "loan456",
      "memberId": "cm123abc",
      "storeLocation": "Main Store",
      "checkoutAt": "2023-01-15T10:00:00.000Z",
      "dueDate": "2023-02-14T10:00:00.000Z",
      "photoUrl": "loans/loan456/photo.jpg",
      "thumbnailUrl": "loans/loan456/thumb.jpg"
    }
  }
}

Error (400/404):
{
  "message": "Missing required fields" | "Loan not found"
}
```

**Database Operations:**
- Marks old loan as returned with `swappedAt` timestamp
- Creates new loan with swap relationship
- Updates member's `swapsUsed` count
- Links loans via `swappedForId` and `swappedFromId`

---

### 2.4 Get Active Loans
```
GET /api/loans/active/{memberId}
```

**Endpoint Details:**
- **Method**: GET
- **URL**: `/api/loans/active/{memberId}`
- **Authentication**: None
- **Rate Limits**: None

**Request Requirements:**
```javascript
URL Parameters:
- memberId: string (required)
```

**Response Format:**
```javascript
Success (200):
{
  "success": true,
  "data": [
    {
      "id": "loan123",
      "memberId": "cm123abc",
      "storeLocation": "Main Store",
      "checkoutAt": "2023-01-01T10:00:00.000Z",
      "dueDate": "2023-01-31T10:00:00.000Z",
      "returnedAt": null,
      "photoUrl": "loans/loan123/photo.jpg",
      "thumbnailUrl": "loans/loan123/thumb.jpg",
      "createdAt": "2023-01-01T10:00:00.000Z",
      "gallery": [
        {
          "id": "photo123",
          "r2Key": "loans/loan123/gallery/photo.jpg"
        }
      ]
    }
  ]
}

Error (400):
{
  "message": "Missing memberId"
}
```

**Database Operations:**
- Queries `Loan` table for loans where `returnedAt` is null
- Includes related `LoanPhoto` gallery data
- Filters by `memberId`

---

### 2.5 Get Returned Loans
```
GET /api/loans/returned/{memberId}
```

**Endpoint Details:**
- **Method**: GET
- **URL**: `/api/loans/returned/{memberId}`
- **Authentication**: None
- **Rate Limits**: None

**Request Requirements:**
```javascript
URL Parameters:
- memberId: string (required)
```

**Response Format:**
```javascript
Success (200):
{
  "success": true,
  "data": [
    {
      "id": "loan123",
      "memberId": "cm123abc",
      "storeLocation": "Main Store",
      "photoUrl": "https://example.com/photo1.jpg",
      "thumbnailUrl": "https://example.com/thumbnail1.jpg",
      "checkoutAt": "2023-01-01T10:00:00.000Z",
      "dueDate": "2023-01-31T10:00:00.000Z",
      "returnedAt": "2023-01-15T10:30:00.000Z",
      "createdAt": "2023-01-01T10:00:00.000Z",
      "gallery": [
        {
          "id": "photo123",
          "r2Key": "photos/abc123.jpg",
          "metadata": {}
        }
      ]
    }
  ]
}

Error (400):
{
  "success": false,
  "message": "Missing memberId"
}
```

**Database Operations:**
- Queries `Loan` table for loans where `returnedAt` is not null
- Includes related `LoanPhoto` gallery data with metadata
- Filters by `memberId`

---

## 3. Upload Endpoints

### 3.1 Upload Single Loan Photo
```
POST /api/uploads/loan-photo
```

**Endpoint Details:**
- **Method**: POST
- **URL**: `/api/uploads/loan-photo`
- **Authentication**: None
- **Rate Limits**: None
- **Idempotency**: NOT required (excluded by middleware)

**Request Requirements:**
```javascript
Headers: {
  "Content-Type": "multipart/form-data"
}

FormData: {
  "photo": File (required, max 5MB),
  "memberId": "string (required)"
}
```

**File Validation:**
- **Allowed formats**: JPEG, PNG, GIF, WebP
- **Max size**: 5MB per file
- **Max files**: 1 (single upload)

**Response Format:**
```javascript
Success (201):
{
  "success": true,
  "data": {
    "uploadId": "upload123",
    "status": "success"
  }
}

Error (400):
{
  "message": "memberId is required" | "Photo file is required" | "Invalid file type"
}

Error (500):
{
  "message": "Internal server error"
}
```

**Implementation Details:**
- Uses `multer` with memory storage
- Creates `LoanPhoto` record before upload
- Uploads to Cloudflare R2 storage
- Updates record with R2 key and metadata

---

### 3.2 Upload Multiple Loan Photos
```
POST /api/uploads/loan-photos
```

**Endpoint Details:**
- **Method**: POST
- **URL**: `/api/uploads/loan-photos`
- **Authentication**: None
- **Rate Limits**: None
- **Idempotency**: NOT required (excluded by middleware)

**Request Requirements:**
```javascript
Headers: {
  "Content-Type": "multipart/form-data"
}

FormData: {
  "photos": [File, File, File] (required, array, max 10 files),
  "memberId": "string (required)"
}
```

**File Validation:**
- **Allowed formats**: JPEG, PNG, GIF, WebP
- **Max size**: 5MB per file
- **Max files**: 10 files per request

**Response Format:**
```javascript
Success (201):
{
  "success": true,
  "data": {
    "uploadIds": ["upload123", "upload456"],
    "count": 2,
    "status": "success"
  }
}

Error (400):
{
  "message": "memberId is required" | "At least one photo file is required" | 
           "Invalid file types: image/bmp"
}

Error (500):
{
  "message": "Internal server error"
}
```

**Implementation Details:**
- Uses `multer` with memory storage
- Processes files in parallel using `Promise.all`
- Creates `LoanPhoto` records before upload
- Uploads to Cloudflare R2 storage
- Updates records with R2 keys and metadata

---

## 4. Utility Endpoints

### 4.1 Health Check
```
GET /
```

**Response Format:**
```javascript
Success (200):
{
  "status": "ok",
  "server": "ReJoEs Backend API",
  "environment": "development|production",
  "database": "connected|disconnected",
  "timestamp": "2023-01-01T00:00:00.000Z"
}

Error (503):
{
  "status": "error",
  "server": "ReJoEs Backend API",
  "environment": "development|production",
  "database": "disconnected",
  "error": "Database connection failed",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

### 4.2 CORS Test
```
GET /api/cors-test
```

**Response Format:**
```javascript
Success (200):
{
  "message": "CORS successful",
  "origin": "https://your-shopify-app.com",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

### 4.3 API Documentation
```
GET /docs
```

**Description**: Swagger UI documentation available at `/docs`

---

## 5. Error Handling Standards

### Standard Error Response Format
```javascript
{
  "message": "Human-readable error message",
  "details": {} // Only for AppError instances
}
```

### Common HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **404**: Not Found
- **500**: Internal Server Error
- **503**: Service Unavailable (database issues)

### Error Types
1. **AppError**: Custom application errors with details
2. **Prisma Errors**: Database constraint violations
3. **Multer Errors**: File upload issues
4. **Generic Errors**: Unhandled exceptions

---

## 6. Frontend Integration Issues & Solutions

### 6.1 Upload Endpoints 500 Errors

**Problem**: Frontend sends FormData but gets 500 errors

**Root Causes Identified:**
1. **Missing R2 Configuration**: Cloudflare R2 credentials may not be configured
2. **Database Connection**: Prisma client connection issues
3. **File Size Limits**: Files exceeding 5MB limit
4. **Invalid File Types**: Unsupported MIME types

**Frontend Fix Checklist:**
```javascript
// 1. Ensure correct field names
FormData: {
  "photo": File,        // Single upload
  "photos": [File, File], // Bulk upload (same field name)
  "memberId": "string"
}

// 2. Validate files before upload
const validateFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}`);
  }
  
  if (file.size > maxSize) {
    throw new Error(`File too large: ${file.size} bytes`);
  }
};

// 3. Add error handling for network issues
try {
  const response = await fetch('/api/uploads/loan-photo', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Upload failed');
  }
} catch (error) {
  console.error('Upload error:', error);
  // Handle specific error cases
}
```

### 6.2 Idempotency Header Requirements

**Problem**: POST requests failing without idempotency key

**Solution**: Add header to all POST requests (except uploads)
```javascript
const headers = {
  'Content-Type': 'application/json',
  'x-idempotency-key': generateUniqueId() // e.g., UUID or timestamp
};
```

### 6.3 CORS Configuration for Production

**Current Issue**: CORS allows all origins (`*`)

**Required Fix**: Update app.ts for production
```javascript
app.use(cors({
  origin: ['https://your-shopify-app.com', 'https://admin.shopify.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'x-idempotency-key'],
  credentials: true
}));
```

---

## 7. Environment Configuration

### Required Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/rejoes"

# Server
PORT=3000
NODE_ENV="development|production"

# Cloudflare R2 Storage
R2_ENDPOINT="https://your-account.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET="rejoes-uploads"
```

### Database Schema Summary
- **Member**: Customer information with tier and usage tracking
- **Loan**: Rental items with checkout/return tracking
- **LoanPhoto**: Uploaded images with R2 storage keys
- **AuditEvent**: Action logging for compliance

---

## 8. Rate Limiting & Performance

### Current Status
- **No rate limiting** implemented
- **Idempotency cache**: 10-minute TTL
- **File upload limits**: 5MB per file, 10 files max
- **Database indexes**: Optimized for member/loan queries

### Recommended Production Enhancements
1. **Rate limiting**: Implement express-rate-limit
2. **Request validation**: Add joi or zod schemas
3. **Authentication**: Add JWT or Shopify OAuth
4. **Logging**: Structured logging with winston
5. **Monitoring**: Health checks and metrics

---

## 9. Testing & Development

### Local Development Setup
```bash
# Install dependencies
npm install

# Start database (PostgreSQL)
docker run -d -p 5432:5432 -e POSTGRES_DB=rejoes postgres

# Run migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### API Testing
- **Swagger UI**: http://localhost:3000/docs
- **CORS Test**: http://localhost:3000/api/cors-test
- **Health Check**: http://localhost:3000/

---

## 10. Production Deployment Checklist

### Security
- [ ] Restrict CORS origins to Shopify domains
- [ ] Add authentication middleware
- [ ] Implement rate limiting
- [ ] Set up SSL/TLS
- [ ] Configure security headers (helmet)

### Performance
- [ ] Add database connection pooling
- [ ] Implement caching strategy
- [ ] Set up CDN for static assets
- [ ] Monitor R2 storage costs

### Monitoring
- [ ] Add structured logging
- [ ] Set up error tracking (Sentry)
- [ ] Implement health checks
- [ ] Monitor database performance

### Backup & Recovery
- [ ] Database backup strategy
- [ ] R2 storage redundancy
- [ ] Disaster recovery plan

---

## Summary

The Rejoes POS backend provides a complete API for member management, loan tracking, and file uploads. The main integration issues are:

1. **Upload 500 errors**: Likely due to missing R2 configuration or file validation
2. **Missing idempotency headers**: Required for POST requests
3. **CORS configuration**: Too permissive for production

All endpoints are functional and well-documented. The frontend should implement proper error handling, file validation, and include required headers for successful integration.

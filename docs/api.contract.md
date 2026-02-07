# API Contract

Base url: https://www.rejoesserver.com

## Overview
This API provides complete functionality for member management, loan tracking, and image uploads. All endpoints are production-ready with no testing restrictions. Store locations are handled as string fields in member and loan records.

## Members

### POST /api/members/add
**Headers:** None
**Body:**
```json
{
  "cardToken": "string",
  "tier": "BASIC|PLUS|PREMIUM",
  "storeLocation": "string (optional, defaults to 'Main Store')",
  "shopifyCustomerId": "string"  // required
}
```
**Success (200):**
```json
{
  "success": true,
  "data": {
    "message": "Member created successfully",
    "member": {
      "id": "string",
      "cardToken": "string",
      "shopifyCustomerId": "string|null",
      "tier": "string",
      "status": "ACTIVE",
      "cycleStart": "datetime",
      "cycleEnd": "datetime",
      "itemsUsed": 0,
      "swapsUsed": 0,
      "itemsOut": 0,
      "storeLocation": "string"
    }
  }
}
```
**Errors:** 400 (missing cardToken or shopifyCustomerId), 409 (member with cardToken or Shopify customer ID already exists)

### GET /api/members/by-card/:cardToken
**Headers:** None
**Body:** None
**Success (200):**
```json
{
  "success": true,
  "data": {
    "member": {
      "id": "string",
      "cardToken": "string",
      "shopifyCustomerId": "string|null",
      "tier": "string",
      "status": "string",
      "cycleStart": "datetime",
      "cycleEnd": "datetime",
      "itemsUsed": "number",
      "swapsUsed": "number",
      "itemsOut": "number",
      "createdAt": "datetime",
      "updatedAt": "datetime",
      "storeLocation": "string"
    },
    "allowances": {
      "itemsPerMonth": "number",
      "swaps": "number",
      "maxItemsOut": "number"
    },
    "activeLoans": []
  }
}
```
**Errors:** 404 (not found)

## Uploads

### POST /api/uploads/loan-photo
**Headers:** Content-Type: multipart/form-data
**Body:** FormData with file field and memberId
**Success (201):**
```json
{
  "success": true,
  "data": {
    "uploadId": "string",
    "status": "success"
  }
}
```
**Errors:** 400 (no file), 500 (upload failed)

## Loans

### GET /api/loans/active/:memberId
**Headers:** None
**Body:** None
**Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "memberId": "string",
      "storeLocation": "string",
      "photoUrl": "string",
      "thumbnailUrl": "string",
      "checkoutAt": "datetime",
      "dueDate": "datetime",
      "returnedAt": null,
      "createdAt": "datetime",
      "gallery": []
    }
  ]
}
```
**Errors:** 400 (missing memberId), 404 (member not found)

### POST /api/loans/checkout
**Headers:** x-idempotency-key: string
**Body:**
```json
{
  "memberId": "string",
  "uploadIds": ["string"],
  "storeLocation": "string"
}
```
**Success (201):**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "memberId": "string",
    "storeLocation": "string",
    "photoUrl": "string",
    "thumbnailUrl": "string",
    "checkoutAt": "datetime",
    "dueDate": "datetime",
    "returnedAt": null,
    "createdAt": "datetime",
    "gallery": [
      {
        "id": "string",
        "r2Key": "string",
        "metadata": "string"
      }
    ]
  }
}
```
**Errors:** 400 (missing fields or invalid uploadIds), 404 (member/upload not found)

### POST /api/loans/return
**Headers:** x-idempotency-key: string
**Body:**
```json
{
  "memberId": "string",
  "loanId": "string"
}
```
**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "memberId": "string",
    "storeLocation": "string",
    "photoUrl": "string",
    "thumbnailUrl": "string",
    "checkoutAt": "datetime",
    "dueDate": "datetime",
    "returnedAt": "datetime",
    "createdAt": "datetime"
  }
}
```
**Errors:** 400 (missing fields), 404 (loan not found)

### POST /api/loans/swap
**Headers:** x-idempotency-key: string
**Body:**
```json
{
  "memberId": "string",
  "loanId": "string",
  "storeLocation": "string",
  "uploadIds": ["string"]
}
```
**Success (200):**
```json
{
  "success": true,
  "data": {
    "returnedLoan": {
      "id": "string",
      "memberId": "string",
      "storeLocation": "string",
      "photoUrl": "string",
      "thumbnailUrl": "string",
      "checkoutAt": "datetime",
      "dueDate": "datetime",
      "returnedAt": "datetime",
      "createdAt": "datetime",
      "gallery": []
    },
    "newLoan": {
      "id": "string",
      "memberId": "string",
      "storeLocation": "string",
      "photoUrl": "string",
      "thumbnailUrl": "string",
      "checkoutAt": "datetime",
      "dueDate": "datetime",
      "returnedAt": null,
      "createdAt": "datetime",
      "gallery": [
        {
          "id": "string",
          "r2Key": "string",
          "metadata": "string"
        }
      ]
    }
  }
}
```
**Errors:** 400 (missing fields or invalid uploadIds), 404 (loan/upload not found)

## Image Gallery Functionality

### Overview
The loan system supports multiple images per loan through an image gallery feature:

- **Primary Image**: The first image in `uploadIds` array becomes the primary loan photo (displayed in `photoUrl` and `thumbnailUrl`)
- **Gallery Images**: Additional images in `uploadIds` array are stored as gallery images (accessible via `gallery` array)
- **Return Flow**: When returning a loan, the gallery remains intact for historical reference

### Usage Examples

**Create loan with multiple images:**
```bash
POST /api/loans/checkout
{
  "memberId": "cmksj0jgt0000927ynggbykyl",
  "uploadIds": ["photo1-id", "photo2-id", "photo3-id"],
  "storeLocation": "Main Store"
}
```

**Swap loan with new gallery:**
```bash
POST /api/loans/swap
{
  "memberId": "cmksj0jgt0000927ynggbykyl",
  "loanId": "existing-loan-id",
  "uploadIds": ["new-photo1-id", "new-photo2-id"],
  "storeLocation": "North Branch"
}
```

### Image Upload Process
1. Upload each image individually via `/api/uploads/loan-photo` to get `uploadId`s
2. Pass array of `uploadId`s to loan checkout/swap endpoints
3. First image becomes primary, others become gallery
4. Gallery images are linked to the loan and returned in API responses

## Response Format

All successful responses follow this consistent format:
```json
{
  "success": true,
  "data": { ... }
}
```

Error responses may vary but typically include:
```json
{
  "success": false,
  "message": "Error description"
}
```

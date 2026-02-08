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

### POST /api/uploads/loan-photos
**Headers:** Content-Type: multipart/form-data
**Body:** FormData with array of files and memberId
**Success (201):**
```json
{
  "success": true,
  "data": {
    "uploadIds": ["string"],
    "count": "number",
    "status": "success"
  }
}
```
**Errors:** 400 (no files or invalid file types), 500 (upload failed)
**Limits:** Max 10 files, 5MB per file, supports JPEG, PNG, GIF, WebP

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
      "swappedAt": "datetime|null",
      "swappedFor": {
        "id": "string",
        "photoUrl": "string",
        "thumbnailUrl": "string",
        "checkoutAt": "datetime",
        "dueDate": "datetime"
      } | null,
      "swappedFrom": {
        "id": "string",
        "photoUrl": "string",
        "thumbnailUrl": "string",
        "checkoutAt": "datetime",
        "dueDate": "datetime"
      } | null,
      "gallery": [
        {
          "id": "string",
          "r2Key": "string",
          "metadata": "object"
        }
      ]
    }
  ]
}
```
**Notes:** 
- Gallery includes ALL uploaded photos (including primary photo). The first uploaded photo appears as both `photoUrl`/`thumbnailUrl` and in the `gallery` array.
- **Swap Tracking Fields:**
  - `swappedAt`: Timestamp when this loan was swapped out (null for non-swapped loans)
  - `swappedFor`: Reference to the new loan that replaced this one (null for active loans)
  - `swappedFrom`: Reference to the old loan that this one replaced (populated for swapped-in loans)
**Errors:** 400 (missing memberId), 404 (member not found)

### GET /api/loans/returned/:memberId
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
      "returnedAt": "datetime",
      "createdAt": "datetime",
      "swappedAt": "datetime|null",
      "swappedFor": {
        "id": "string",
        "photoUrl": "string",
        "thumbnailUrl": "string",
        "checkoutAt": "datetime",
        "dueDate": "datetime"
      } | null,
      "swappedFrom": {
        "id": "string",
        "photoUrl": "string",
        "thumbnailUrl": "string",
        "checkoutAt": "datetime",
        "dueDate": "datetime"
      } | null,
      "gallery": [
        {
          "id": "string",
          "r2Key": "string",
          "metadata": "object"
        }
      ]
    }
  ]
}
```
**Notes:** 
- Returns all returned loans for the specified member, sorted by `returnedAt` in descending order (most recent first).
- Gallery includes ALL uploaded photos (including primary photo). The first uploaded photo appears as both `photoUrl`/`thumbnailUrl` and in the `gallery` array.
- The `returnedAt` field will always have a value since this endpoint only returns returned loans.
- **Swap Tracking Fields:**
  - `swappedAt`: Timestamp when this loan was swapped out (populated for swapped-out loans)
  - `swappedFor`: Reference to the new loan that replaced this one (populated for swapped-out loans)
  - `swappedFrom`: Reference to the old loan that this one replaced (null for returned loans)

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
    "swappedAt": null,
    "swappedFor": null,
    "swappedFrom": null,
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
    "createdAt": "datetime",
    "swappedAt": null,
    "swappedFor": null,
    "swappedFrom": null
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
      "swappedAt": "datetime",
      "swappedFor": {
        "id": "string",
        "photoUrl": "string",
        "thumbnailUrl": "string",
        "checkoutAt": "datetime",
        "dueDate": "datetime"
      },
      "swappedFrom": null,
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
      "swappedAt": null,
      "swappedFor": null,
      "swappedFrom": {
        "id": "string",
        "photoUrl": "string",
        "thumbnailUrl": "string",
        "checkoutAt": "datetime",
        "dueDate": "datetime"
      },
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
**Notes:**
- **Swap Tracking Behavior:**
  - `returnedLoan`: The original loan that was swapped out, now marked as returned with `swappedAt` timestamp and `swappedFor` reference
  - `newLoan`: The new loan that replaces the old one, with `swappedFrom` reference to the original loan
  - Both loans maintain their photo galleries for historical reference
**Errors:** 400 (missing fields or invalid uploadIds), 404 (loan/upload not found)

## Swap Tracking Functionality

### Overview
The loan system supports comprehensive swap tracking that allows you to trace the complete lifecycle of loan exchanges:

- **Swap Relationships**: Each loan maintains bidirectional references to its swap counterparts
- **Timestamp Tracking**: Exact swap times are recorded for audit purposes
- **Gallery Preservation**: Photo galleries are maintained across swap operations
- **Historical Trace**: Complete swap chain can be reconstructed from the data

### Swap Tracking Fields

All loan objects include these swap tracking fields:

| Field | Type | Description |
|-------|------|-------------|
| `swappedAt` | `datetime|null` | Timestamp when the loan was swapped out (null for non-swapped loans) |
| `swappedFor` | `object|null` | Reference to the new loan that replaced this one (null for active loans) |
| `swappedFrom` | `object|null` | Reference to the old loan that this one replaced (null for original loans) |

### Swap Behavior Patterns

**Swapped-Out Loan (appears in returned loans):**
```json
{
  "swappedAt": "2023-01-15T10:30:00Z",
  "swappedFor": {
    "id": "new-loan-id",
    "photoUrl": "new-loan-photo.jpg",
    "checkoutAt": "2023-01-15T10:30:00Z",
    "dueDate": "2023-02-14T10:30:00Z"
  },
  "swappedFrom": null
}
```

**Swapped-In Loan (appears in active loans):**
```json
{
  "swappedAt": null,
  "swappedFor": null,
  "swappedFrom": {
    "id": "old-loan-id",
    "photoUrl": "old-loan-photo.jpg",
    "checkoutAt": "2023-01-01T10:00:00Z",
    "dueDate": "2023-01-31T10:00:00Z"
  }
}
```

### Usage Examples

**Track swap history:**
```bash
# Get active loans to see swapped-in loans
GET /api/loans/active/member-id

# Get returned loans to see swapped-out loans  
GET /api/loans/returned/member-id

# Each loan shows its swap relationship
# Active loans show what they replaced (swappedFrom)
# Returned loans show what replaced them (swappedFor)
```

**Swap operation flow:**
1. Original loan is marked as returned with `swappedAt` timestamp
2. New loan is created with `swappedFrom` reference to original
3. Original loan gets `swappedFor` reference to new loan
4. Both loans maintain their photo galleries

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
1. Upload images individually via `/api/uploads/loan-photo` OR upload multiple at once via `/api/uploads/loan-photos` to get `uploadId`s
2. Pass array of `uploadId`s to loan checkout/swap endpoints
3. First image becomes primary, others become gallery
4. Gallery images are linked to the loan and returned in API responses

### Bulk Upload Example
```bash
# Upload multiple images at once (faster)
POST /api/uploads/loan-photos
Content-Type: multipart/form-data

FormData:
- memberId: "cmksj0jgt0000927ynggbykyl"
- photos: [file1.jpg, file2.jpg, file3.jpg]

Response:
{
  "success": true,
  "data": {
    "uploadIds": ["upload1-id", "upload2-id", "upload3-id"],
    "count": 3,
    "status": "success"
  }
}
```

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

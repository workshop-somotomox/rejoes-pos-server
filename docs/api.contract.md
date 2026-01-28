Base url: https://rejoes-pos-server-oyolloo.up.railway.app

# API Contract

## Members

### POST /members/dev/seed-member
**Headers:** None
**Body:**
```json
{
  "cardToken": "string",
  "tier": "BASIC|PLUS|PREMIUM"
}
```
**Success (200):**
```json
{
  "message": "Test member created successfully",
  "member": {
    "id": "string",
    "cardToken": "string",
    "tier": "string",
    "status": "ACTIVE",
    "cycleStart": "datetime",
    "cycleEnd": "datetime",
    "itemsUsed": "number",
    "swapsUsed": "number",
    "itemsOut": "number"
  }
}
```
**Errors:** 400 (missing cardToken), 403 (production), 409 (duplicate)

### GET /members/by-card/:cardToken
**Headers:** None
**Body:** None
**Success (200):**
```json
{
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
    "loans": []
  },
  "allowances": {
    "itemsPerMonth": "number",
    "swaps": "number",
    "maxItemsOut": "number"
  },
  "activeLoans": []
}
```
**Errors:** 404 (not found)

## Uploads

### POST /uploads/loan-photo
**Headers:** Content-Type: multipart/form-data
**Body:** FormData with file field and memberId
**Success (201):**
```json
{
  "uploadId": "string",
  "status": "success"
}
```
**Errors:** 400 (no file), 500 (upload failed)

## Loans

### GET /loans/active/:memberId
**Headers:** None
**Body:** None
**Success (200):**
```json
[
  {
    "id": "string",
    "memberId": "string",
    "storeLocation": "string",
    "photoUrl": "string",
    "thumbnailUrl": "string",
    "checkoutAt": "datetime",
    "dueDate": "datetime",
    "returnedAt": null,
    "createdAt": "datetime"
  }
]
```
**Errors:** 400 (missing memberId), 404 (member not found)

### POST /loans/checkout
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
```
**Errors:** 400 (missing fields or invalid uploadIds), 404 (member/upload not found)

### POST /loans/return
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
```
**Errors:** 400 (missing fields), 404 (loan not found)

### POST /loans/swap
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
```
**Errors:** 400 (missing fields or invalid uploadIds), 404 (loan/upload not found)

### GET /loans/active/:memberId
**Success (200):**
```json
[
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
    "gallery": [
      {
        "id": "string",
        "r2Key": "string",
        "metadata": "string"
      }
    ]
  }
]
```
**Errors:** 400 (missing memberId), 404 (member not found)

## Image Gallery Functionality

### Overview
The loan system now supports multiple images per loan through an image gallery feature:

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
  "storeLocation": "Store A"
}
```

**Swap loan with new gallery:**
```bash
POST /api/loans/swap
{
  "memberId": "cmksj0jgt0000927ynggbykyl",
  "loanId": "existing-loan-id",
  "uploadIds": ["new-photo1-id", "new-photo2-id"],
  "storeLocation": "Store B"
}
```

### Image Upload Process
1. Upload each image individually via `/api/uploads/loan-photo` to get `uploadId`s
2. Pass array of `uploadId`s to loan checkout/swap endpoints
3. First image becomes primary, others become gallery
4. Gallery images are linked to the loan and returned in API responses


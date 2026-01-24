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
  "uploadId": "string",
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
  "createdAt": "datetime"
}
```
**Errors:** 400 (missing fields), 404 (member/upload not found)

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
  "uploadId": "string"
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
    "createdAt": "datetime"
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
    "createdAt": "datetime"
  }
}
```
**Errors:** 400 (missing fields), 404 (loan/upload not found)


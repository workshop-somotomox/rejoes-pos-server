# ReJoEs Backend API Guide

This document summarizes all available backend endpoints and provides guidance on how to integrate with them. The backend is designed for Shopify POS staff workflows—there is no public client.

## Table of Contents
1. [Member APIs](#member-apis)
2. [Loan APIs](#loan-apis)
3. [Upload API](#upload-api)
4. [Shopify Webhook](#shopify-webhook)
5. [Implementation & Integration Notes](#implementation--integration-notes)

---

## Member APIs
### `GET /api/members/by-card/:cardToken`
Looks up a member by barcode (card token).

**Response:**
```json
{
  "member": {
    "id": "string",
    "shopifyCustomerId": "string",
    "cardToken": "string",
    "tier": "BASIC | PLUS | PREMIUM",
    "status": "ACTIVE | PAUSED | CANCELLED",
    "cycleStart": "ISO date",
    "cycleEnd": "ISO date",
    "itemsUsed": 0,
    "swapsUsed": 0,
    "itemsOut": 0,
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  },
  "allowances": {
    "itemsPerMonth": number,
    "swaps": number,
    "maxItemsOut": number
  },
  "activeLoans": [
    {
      "id": "string",
      "thumbnailUrl": "string"
    }
  ]
}
```

**Usage guidance:**
- Always call this endpoint before checkout/return/swap to display current allowances and ensure counters are in sync.
- If you cache the response, invalidate it after any loan mutation to avoid stale allowance data.

---

## Loan APIs
All POST loan endpoints require the `x-idempotency-key` header. Generate a unique key per POS action to prevent duplicate charges.

### `POST /api/loans/checkout`
Creates a new loan (checkout).

**Body:**
```json
{
  "memberId": "string",
  "storeLocation": "string",
  "photoUrl": "string",
  "thumbnailUrl": "string"
}
```

**Response:** Newly created loan record.

**Rules enforced:**
- Subscription must be active.
- Monthly allowance and max items out must not be exceeded.
- Counters auto-reset when a billing cycle boundary is detected.

### `POST /api/loans/return`
Marks an existing loan as returned.

**Body:**
```json
{
  "memberId": "string",
  "loanId": "string"
}
```

**Response:** Updated loan.

**Notes:**
- Fails if the loan does not belong to the member or is already returned.
- Decrements `itemsOut` counter.

### `POST /api/loans/swap`
Performs a swap (return + new checkout counted as a swap).

**Body:**
```json
{
  "memberId": "string",
  "loanId": "string",          // loan being returned
  "storeLocation": "string",
  "photoUrl": "string",
  "thumbnailUrl": "string"
}
```

**Response:**
```json
{
  "returnedLoan": { ... },
  "newLoan": { ... }
}
```

**Rules enforced:**
- Swap allowance must be available.
- Member must have at least one item out.
- Items/month cap still applies (swap counts as a checkout).

### `GET /api/loans/active/:memberId`
Returns all active (not returned) loans for a member with most recent checkout first.

**Response:** Array of loan objects.

---

## Upload API
### `POST /api/uploads/loan-photo`
Accepts a multipart form upload with field `photo`. Stores original + thumbnail images locally using Sharp.

**Response:**
```json
{
  "photoUrl": "/uploads/originals/...jpg",
  "thumbnailUrl": "/uploads/thumbnails/...jpg"
}
```

**Usage guidance:**
1. Staff captures garment photo on POS device.
2. Upload photo via this endpoint.
3. Use returned URLs when calling loan checkout/swap.

---

## Shopify Webhook
### `POST /api/webhooks/subscription`
Consumes Shopify subscription webhook events. The middleware verifies the `x-shopify-hmac-sha256` header with `SHOPIFY_WEBHOOK_SECRET`.

**Payload format:**
```json
{
  "type": "subscription_created | subscription_updated | subscription_cancelled",
  "data": {
    "shopifyCustomerId": "string",
    "cardToken": "string",
    "planHandle": "basic | plus | premium",
    "status": "active | paused | cancelled",
    "cycleStart": "ISO string",
    "cycleEnd": "ISO string"
  }
}
```

**Effect:**
- Upserts member record.
- Updates tier, status, cycle dates, and card token.
- Logs an audit event per webhook.

**Implementation tips:**
- Expose this endpoint publicly only to Shopify.
- Ensure raw request body is preserved (already handled in `app.ts`).
- Rotate webhook secret via environment config when necessary.

---

## Implementation & Integration Notes
1. **Idempotency:**
   - All POST routes are idempotent via the `x-idempotency-key` header. Clients must provide a UUID for every POS action (checkout/return/swap/upload).

2. **Transactions:**
   - Loan mutations run in Prisma transactions to guarantee counters and audit events stay consistent.

3. **Audit Logging:**
   - Every loan/subscription action writes an `AuditEvent` with JSON metadata. For now, metadata is stored as a serialized string because SQLite lacks JSON support.

4. **Counters & Cycles:**
   - `resetCountersIfNewCycle` runs on every mutation to avoid stale counters.
   - Tiers and statuses are normalized to uppercase for consistency.

5. **Image Storage:**
   - Files are saved locally under `/uploads/originals` and `/uploads/thumbnails`.
   - In production, mount persistent storage or replace with cloud storage before scaling.

6. **Database:**
   - Current schema uses SQLite (configured via `DATABASE_URL="file:./dev.db"`).
   - When returning to PostgreSQL, reintroduce enums/JSON fields in Prisma schema and run migrations.

7. **Environment Variables:**
   - `PORT`, `NODE_ENV`, `DATABASE_URL`, `SHOPIFY_WEBHOOK_SECRET`.
   - Docker compose currently provisions Postgres but can be adjusted for SQLite or future systems.

8. **Running Locally:**
   ```bash
   npm install
   npx prisma migrate dev
   npm run dev
   ```

9. **Testing Workflow:**
   - Use tools like Postman or curl to hit endpoints with representative payloads.
   - Verify the state via Prisma Studio (`npx prisma studio`).

---

Feel free to extend this guide with additional operational procedures or troubleshooting notes as the system evolves.

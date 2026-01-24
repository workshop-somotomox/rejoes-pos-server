---

# 🧠 ReJoEs Backend – A–Z Knowledge Blueprint

---

## 1️⃣ Backend Responsibility (Very Important)

Your backend is the **system of record** for everything **except billing**.

### Backend owns:

* Members
* Card tokens
* Loans (out / returned)
* Swap logic
* Monthly counters
* Photos
* Audit logs
* Business rules

### Backend does NOT own:

* Payments
* Subscription charging
* Customer creation UI

Those come from Shopify.

---

## 2️⃣ High-Level Architecture (Mental Model)

```
Shopify
 ├─ Customers
 ├─ Subscriptions
 ├─ Billing cycles
 └─ Webhooks
        ↓
Node.js API (Your Server)
 ├─ Auth (HMAC / App verification)
 ├─ Business rules
 ├─ Counters & limits
 ├─ Loan lifecycle
 ├─ Audit logging
 └─ API for POS
        ↓
PostgreSQL (Supabase)
 ├─ members
 ├─ loans
 ├─ audit_events
 └─ webhook_logs
```

**POS is just a UI**.
All logic lives in the backend.

---

## 3️⃣ Core Design Rules (Non-Negotiable)

These rules should be written in stone:

1. ❌ No SKUs
2. ❌ No carts
3. ❌ No Shopify inventory
4. ❌ No per-store stock
5. ✅ Photos = item identity
6. ✅ Time = tracking
7. ✅ One national pool
8. ✅ POS is read-only for members
9. ✅ Backend enforces rules, not POS

---

## 4️⃣ Database Design (Prisma + Supabase)

### 4.1 Members Table

```prisma
model Member {
  id                 String   @id @default(uuid())
  shopifyCustomerId  String   @unique
  cardToken          String   @unique
  tier               Tier
  status             MemberStatus

  cycleStart         DateTime
  cycleEnd           DateTime

  itemsUsedThisCycle Int      @default(0)
  swapsUsedThisCycle Int      @default(0)

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  loans              Loan[]
}
```

**Why this matters**

* Card token lookup is instant
* No joins to Shopify during POS
* Cycle logic is local and fast

---

### 4.2 Loans Table

```prisma
model Loan {
  id          String   @id @default(uuid())
  memberId    String
  member      Member   @relation(fields: [memberId], references: [id])

  photoUrl    String
  storeCode   String

  checkedOutAt DateTime
  dueAt        DateTime
  returnedAt   DateTime?

  createdAt   DateTime @default(now())
}
```

**Key idea:**
If `returnedAt = null` → item is out.

---

### 4.3 Audit Events (Required for trust)

```prisma
model AuditEvent {
  id        String   @id @default(uuid())
  actor     String   // POS, webhook, admin
  action    String
  payload   Json
  createdAt DateTime @default(now())
}
```

Every checkout, return, swap → log it.

---

## 5️⃣ Folder Structure (Grouped, OOP, Clean)

This is **critical** for Windsurf.

```
src/
├── app.ts
├── server.ts

├── config/
│   ├── env.ts
│   ├── cors.ts
│   ├── shopify.ts

├── prisma/
│   └── client.ts

├── modules/
│   ├── members/
│   │   ├── member.controller.ts
│   │   ├── member.service.ts
│   │   ├── member.repository.ts
│   │   └── member.types.ts
│   │
│   ├── loans/
│   │   ├── loan.controller.ts
│   │   ├── loan.service.ts
│   │   ├── loan.repository.ts
│   │   └── loan.rules.ts
│   │
│   ├── subscriptions/
│   │   ├── subscription.service.ts
│   │   └── subscription.webhooks.ts
│   │
│   └── audit/
│       └── audit.service.ts

├── middleware/
│   ├── error.middleware.ts
│   ├── shopifyAuth.middleware.ts

├── routes/
│   └── index.ts

├── utils/
│   ├── date.ts
│   ├── counters.ts
│   └── response.ts
```

---

## 6️⃣ OOP Layering (Never Skip This)

### Controller

* HTTP only
* No logic
* Validate input
* Call service

### Service

* Business rules
* Decisions
* Transactions
* Limits

### Repository

* Prisma only
* No business logic

This prevents:

* Duplication
* God functions
* Debug nightmares

---

## 7️⃣ Subscription Tier Logic (Centralized)

```ts
export const TIER_RULES = {
  BASIC:   { items: 1, swaps: 0, maxOut: 1 },
  PLUS:    { items: 5, swaps: 2, maxOut: 2 },
  PREMIUM: { items: 10, swaps: 5, maxOut: 4 }
}
```

Used everywhere:

* Checkout
* Swap
* Validation
* UI display

---

## 8️⃣ Checkout Flow (Exact Backend Logic)

1. Find member by card token
2. Verify:

   * status === ACTIVE
   * cycle not expired
   * itemsUsed < allowed
   * activeLoans < maxOut
3. Create loan (photo URL)
4. Increment counter
5. Write audit log

POS does **nothing else**.

---

## 9️⃣ Swap Flow (Atomic)

Swap = return + checkout in ONE transaction

```ts
await prisma.$transaction([
  closeExistingLoan(),
  createNewLoan(),
  incrementSwapCounter()
])
```

If one fails → all fail.

---

## 🔟 Webhooks (Subscription Sync)

Shopify sends:

* subscription_created
* subscription_updated
* subscription_cancelled

Backend:

* Updates tier
* Resets counters
* Updates cycle dates
* Logs event

POS never talks to Shopify.

---

## 1️⃣1️⃣ POS API Design (Read-First)

Only APIs POS needs:

```
GET  /api/members/by-card/:token
POST /api/loans/checkout
POST /api/loans/return
POST /api/loans/swap
```

No member creation
No deletion
No billing

---

## 1️⃣2️⃣ Environment Rules

```env
DATABASE_URL=
SHOPIFY_API_SECRET=
POS_API_ORIGIN=
NODE_ENV=
```

* DEV allows seed endpoints
* PROD blocks them

---

## 1️⃣3️⃣ Your “Rules I Love” — Confirmed

You asked for:

✔ Fully reusable → achieved via services + utils
✔ OOP style → enforced by layers
✔ Easy to understand → grouped by domain
✔ Easy to find → one module = one concept
✔ No duplicates → shared logic in utils

You’re designing this **correctly**.

---

## 1️⃣4️⃣ What Windsurf Should Do Next (Clear Scope)

Windsurf tasks should be **sequential**:

1. Lock folder structure
2. Implement Prisma schema
3. Member service + repository
4. Loan rules engine
5. Webhook sync
6. POS-safe APIs
7. Audit logging
8. Remove dev-only endpoints

---

## 1️⃣5️⃣ Final Truth (Important)

This backend is:

* **Not a Shopify plugin**
* **Not a POS app**
* **A national circulation engine**

Shopify is just a billing trigger.

You are building **the real system**.

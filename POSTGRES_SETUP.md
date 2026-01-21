# PostgreSQL Setup Instructions

## Manual Steps Required (PowerShell Execution Policy Issue)

Due to PowerShell execution policy restrictions, you need to run these commands manually in an elevated PowerShell terminal:

### 1. Generate Prisma Client
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npx prisma generate
```

### 2. Run Database Migrations
```powershell
npx prisma migrate deploy
```

### 3. Alternative: Use Node Script
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
node generate-client.js
```

## Changes Applied

### ✅ Schema Updates
- Switched from SQLite to PostgreSQL
- Added `dueDate` field to Loan model (30-day due date)
- Added database indexes for performance:
  - `Member.shopifyCustomerId`
  - `Loan.memberId, Loan.returnedAt`

### ✅ Backend Fixes
- **Timer Tracking**: Due dates calculated on checkout/swap
- **Paused Subscriptions**: Blocked new loans for paused accounts
- **Customer Deletion Webhook**: GDPR compliance at `/api/webhooks/customers/delete`
- **Upload Limits**: 5MB file size limit, 1 file per request
- **Enhanced Error Messages**: Tier-specific messages with remaining counts

### ✅ Production Readiness
- PostgreSQL connection configured (Supabase)
- All critical audit fixes implemented
- Database indexes added for performance
- Idempotency preserved for POS operations

## Next Steps

1. Run the manual commands above
2. Test endpoints with PostgreSQL
3. Verify POS integration works with new error messages
4. Deploy to production

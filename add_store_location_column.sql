-- Add storeLocation column to Member table
-- This adds a separate field for store location, keeping it distinct from shopifyCustomerId

-- Step 1: Add the storeLocation column as nullable string
ALTER TABLE "Member" ADD COLUMN "storeLocation" TEXT;

-- Step 2: Set default value for existing members (optional - uncomment if needed)
-- UPDATE "Member" SET "storeLocation" = 'Main Store' WHERE "storeLocation" IS NULL;

-- Step 3: Verify the column was added successfully
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'Member' AND column_name = 'storeLocation';

-- The storeLocation field is now separate from shopifyCustomerId
-- shopifyCustomerId will be used only for Shopify integration
-- storeLocation will be used to track which store the member belongs to

-- Example queries for testing the new field:

-- Insert a new member with both fields
-- INSERT INTO "Member" ("id", "cardToken", "shopifyCustomerId", "storeLocation", "tier", "status", "cycleStart", "cycleEnd", "itemsUsed", "swapsUsed", "itemsOut", "createdAt", "updatedAt")
-- VALUES (gen_random_uuid()::text, 'TEST_MEMBER_001', 'shopify_123', 'Main Store', 'BASIC', 'ACTIVE', NOW(), NOW() + INTERVAL '1 month', 0, 0, 0, NOW(), NOW());

-- Query members with both fields
-- SELECT id, cardToken, shopifyCustomerId, storeLocation, tier, status FROM "Member";

-- Update a member's storeLocation
-- UPDATE "Member" SET "storeLocation" = 'North Branch' WHERE cardToken = 'TEST_MEMBER_001';

-- Update a member's shopifyCustomerId
-- UPDATE "Member" SET "shopifyCustomerId" = 'shopify_456' WHERE cardToken = 'TEST_MEMBER_001';

-- Add storeLocation functionality to Member table
-- This script adds the ability to store storeLocation for each member

-- Note: We're reusing the existing shopifyCustomerId column to store storeLocation
-- No schema changes needed since shopifyCustomerId already exists as a nullable string

-- Update existing members to have a default storeLocation (optional)
-- Uncomment the line below if you want to set existing members to a default location
-- UPDATE "Member" SET "shopifyCustomerId" = 'Main Store' WHERE "shopifyCustomerId" IS NULL;

-- The shopifyCustomerId column will now be used to store storeLocation
-- This approach avoids schema changes and reuses existing infrastructure

-- Example queries for testing:

-- Insert a new member with storeLocation (explicitly generate CUID for id)
INSERT INTO "Member" ("id", "cardToken", "shopifyCustomerId", "tier", "status", "cycleStart", "cycleEnd", "itemsUsed", "swapsUsed", "itemsOut", "createdAt", "updatedAt")
VALUES ('cxxxxxxxxxxxxxxxxxxxxxx', 'TEST_MEMBER_001', 'Main Store', 'BASIC', 'ACTIVE', NOW(), NOW() + INTERVAL '1 month', 0, 0, 0, NOW(), NOW());

-- Or use PostgreSQL's gen_random_uuid() if you prefer UUIDs
INSERT INTO "Member" ("id", "cardToken", "shopifyCustomerId", "tier", "status", "cycleStart", "cycleEnd", "itemsUsed", "swapsUsed", "itemsOut", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'TEST_MEMBER_002', 'North Branch', 'PLUS', 'ACTIVE', NOW(), NOW() + INTERVAL '1 month', 0, 0, 0, NOW(), NOW());

-- Query members with their storeLocation
SELECT id, cardToken, shopifyCustomerId as storeLocation, tier, status FROM "Member";

-- Update a member's storeLocation
UPDATE "Member" SET "shopifyCustomerId" = 'South Branch' WHERE cardToken = 'TEST_MEMBER_001';

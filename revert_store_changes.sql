-- Revert Store changes - restore original schema

-- Drop foreign key constraint
ALTER TABLE "Loan" DROP CONSTRAINT IF EXISTS "Loan_storeId_fkey";

-- Drop the storeId index
DROP INDEX IF EXISTS "Loan_storeId_idx";

-- Add back the storeLocation column as TEXT
ALTER TABLE "Loan" ADD COLUMN "storeLocation" TEXT;

-- Update existing loans to have storeLocation based on their storeId
UPDATE "Loan" SET "storeLocation" = 
    CASE 
        WHEN "storeId" = 'store_1' THEN 'Main Store'
        WHEN "storeId" = 'store_2' THEN 'North Branch'
        WHEN "storeId" = 'store_3' THEN 'South Branch'
        ELSE 'Main Store'
    END
WHERE "storeLocation" IS NULL;

-- Drop the storeId column
ALTER TABLE "Loan" DROP COLUMN "storeId";

-- Drop the Store table
DROP TABLE IF EXISTS "Store";

-- Create index for storeLocation if needed
CREATE INDEX IF NOT EXISTS "Loan_storeLocation_idx" ON "Loan"("storeLocation");

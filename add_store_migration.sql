-- Add Store model and update Loan model to use store relationship

-- Create Store table
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- Create unique index on store name
CREATE UNIQUE INDEX "Store_name_key" ON "Store"("name");

-- Insert some default stores first
INSERT INTO "Store" ("id", "name", "location", "address", "phone", "email", "createdAt", "updatedAt") VALUES
('store_1', 'Main Store', 'Downtown', '123 Main St, City, State 12345', '+1-555-0001', 'main@rejoes.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('store_2', 'North Branch', 'North Side', '456 North Ave, City, State 12345', '+1-555-0002', 'north@rejoes.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('store_3', 'South Branch', 'South Side', '789 South Blvd, City, State 12345', '+1-555-0003', 'south@rejoes.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Add storeId column to Loan table as nullable first
ALTER TABLE "Loan" ADD COLUMN "storeId" TEXT;

-- Update existing loans to use the main store based on their storeLocation
UPDATE "Loan" SET "storeId" = 
    CASE 
        WHEN "storeLocation" ILIKE '%downtown%' OR "storeLocation" ILIKE '%main%' THEN 'store_1'
        WHEN "storeLocation" ILIKE '%north%' THEN 'store_2'
        WHEN "storeLocation" ILIKE '%south%' THEN 'store_3'
        ELSE 'store_1' -- default to main store
    END
WHERE "storeId" IS NULL;

-- Now make the column NOT NULL
ALTER TABLE "Loan" ALTER COLUMN "storeId" SET NOT NULL;

-- Create foreign key constraint between Loan and Store
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop the old storeLocation column from Loan table
ALTER TABLE "Loan" DROP COLUMN "storeLocation";

-- Create index for storeId in Loan table
CREATE INDEX "Loan_storeId_idx" ON "Loan"("storeId");

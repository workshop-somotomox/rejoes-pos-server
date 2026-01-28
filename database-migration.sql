-- Remove unique constraint from loanId in LoanPhoto table to support multiple photos per loan
-- This allows multiple LoanPhoto records to reference the same loan (gallery functionality)

-- First, drop any existing unique constraint on loanId
ALTER TABLE "LoanPhoto" DROP CONSTRAINT IF EXISTS "LoanPhoto_loanId_key";

-- The schema.prisma has been updated to remove @unique from loanId field
-- After running this SQL, you can run: npx prisma db push to sync the schema

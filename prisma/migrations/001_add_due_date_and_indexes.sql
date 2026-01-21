-- Add dueDate column to Loan table
ALTER TABLE "Loan" ADD COLUMN "dueDate" TIMESTAMP(3) NOT NULL;

-- Create index on Member.shopifyCustomerId for faster lookups
CREATE INDEX "Member_shopifyCustomerId_idx" ON "Member"("shopifyCustomerId");

-- Create composite index on Loan.memberId and returnedAt for active loan queries
CREATE INDEX "Loan_memberId_returnedAt_idx" ON "Loan"("memberId", "returnedAt");

/*
  Warnings:

  - You are about to drop the column `photoUrl` on the `LoanPhoto` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailUrl` on the `LoanPhoto` table. All the data in the column will be lost.
  - Added the required column `dueDate` to the `Loan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metadata` to the `LoanPhoto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `r2Key` to the `LoanPhoto` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Loan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "storeLocation" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "checkoutAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME NOT NULL,
    "returnedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Loan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Loan" ("checkoutAt", "createdAt", "id", "memberId", "photoUrl", "returnedAt", "storeLocation", "thumbnailUrl") SELECT "checkoutAt", "createdAt", "id", "memberId", "photoUrl", "returnedAt", "storeLocation", "thumbnailUrl" FROM "Loan";
DROP TABLE "Loan";
ALTER TABLE "new_Loan" RENAME TO "Loan";
CREATE INDEX "Loan_memberId_returnedAt_idx" ON "Loan"("memberId", "returnedAt");
CREATE TABLE "new_LoanPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "r2Key" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "loanId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanPhoto_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LoanPhoto" ("createdAt", "id") SELECT "createdAt", "id" FROM "LoanPhoto";
DROP TABLE "LoanPhoto";
ALTER TABLE "new_LoanPhoto" RENAME TO "LoanPhoto";
CREATE UNIQUE INDEX "LoanPhoto_loanId_key" ON "LoanPhoto"("loanId");
CREATE TABLE "new_Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopifyCustomerId" TEXT NOT NULL,
    "cardToken" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "cycleStart" DATETIME NOT NULL,
    "cycleEnd" DATETIME NOT NULL,
    "itemsUsed" INTEGER NOT NULL DEFAULT 0,
    "swapsUsed" INTEGER NOT NULL DEFAULT 0,
    "itemsOut" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Member" ("cardToken", "createdAt", "cycleEnd", "cycleStart", "id", "itemsOut", "itemsUsed", "shopifyCustomerId", "status", "swapsUsed", "tier", "updatedAt") SELECT "cardToken", "createdAt", "cycleEnd", "cycleStart", "id", "itemsOut", "itemsUsed", "shopifyCustomerId", "status", "swapsUsed", "tier", "updatedAt" FROM "Member";
DROP TABLE "Member";
ALTER TABLE "new_Member" RENAME TO "Member";
CREATE UNIQUE INDEX "Member_shopifyCustomerId_key" ON "Member"("shopifyCustomerId");
CREATE UNIQUE INDEX "Member_cardToken_key" ON "Member"("cardToken");
CREATE INDEX "Member_shopifyCustomerId_idx" ON "Member"("shopifyCustomerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

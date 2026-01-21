-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopifyCustomerId" TEXT NOT NULL,
    "cardToken" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'BASIC',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "cycleStart" DATETIME NOT NULL,
    "cycleEnd" DATETIME NOT NULL,
    "itemsUsed" INTEGER NOT NULL DEFAULT 0,
    "swapsUsed" INTEGER NOT NULL DEFAULT 0,
    "itemsOut" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "storeLocation" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "checkoutAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Loan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_shopifyCustomerId_key" ON "Member"("shopifyCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_cardToken_key" ON "Member"("cardToken");

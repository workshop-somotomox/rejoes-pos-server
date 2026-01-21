-- CreateTable
CREATE TABLE "LoanPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "photoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

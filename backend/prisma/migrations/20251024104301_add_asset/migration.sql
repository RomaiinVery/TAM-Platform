-- CreateTable
CREATE TABLE "Asset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ownerAdresse" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountWei" TEXT,
    "metadataUrl" TEXT,
    "tokenAddress" TEXT,
    "txHash" TEXT,
    "chainId" INTEGER,
    "kycAtMint" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Asset_ownerAdresse_idx" ON "Asset"("ownerAdresse");

-- CreateIndex
CREATE INDEX "Asset_tokenAddress_idx" ON "Asset"("tokenAddress");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

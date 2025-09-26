-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER NOT NULL,
    "isFront" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT NOT NULL,
    CONSTRAINT "Photo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Photo" ("createdAt", "height", "id", "isFront", "order", "productId", "role", "sizeBytes", "url", "width") SELECT "createdAt", "height", "id", "isFront", "order", "productId", "role", "sizeBytes", "url", "width" FROM "Photo";
DROP TABLE "Photo";
ALTER TABLE "new_Photo" RENAME TO "Photo";
CREATE INDEX "Photo_productId_isFront_idx" ON "Photo"("productId", "isFront");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "size" TEXT,
    "condition" TEXT,
    "priceCents" INTEGER NOT NULL,
    "dimA" REAL,
    "dimB" REAL,
    "dimC" REAL,
    "sku" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NA_MAGAZYNIE',
    "notes" TEXT
);
INSERT INTO "new_Product" ("brand", "condition", "createdAt", "dimA", "dimB", "dimC", "id", "notes", "priceCents", "size", "sku", "status", "title", "updatedAt") SELECT "brand", "condition", "createdAt", "dimA", "dimB", "dimC", "id", "notes", "priceCents", "size", "sku", "status", "title", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_title_idx" ON "Product"("title");
CREATE INDEX "Product_brand_idx" ON "Product"("brand");
CREATE INDEX "Product_size_idx" ON "Product"("size");
CREATE INDEX "Product_sku_idx" ON "Product"("sku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

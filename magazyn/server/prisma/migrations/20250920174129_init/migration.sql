-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "size" TEXT,
    "condition" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NA_MAGAZYNIE',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "dimA" INTEGER,
    "dimB" INTEGER,
    "dimC" INTEGER,
    "sku" TEXT,
    "notes" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Photo" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'extra',
    "order" INTEGER DEFAULT 0,
    "isFront" BOOLEAN NOT NULL DEFAULT false,
    "sizeBytes" INTEGER,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "public"."Product"("sku");

-- AddForeignKey
ALTER TABLE "public"."Photo" ADD CONSTRAINT "Photo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

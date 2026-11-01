-- STEP 992B1: Explicit authenticated customer QC approval, version-bound to the photo set.
-- Generated Prisma migration; apply only to an approved LOCAL database during STEP 992B2 tests.
CREATE TYPE "QcReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'CHANGES_REQUESTED');

ALTER TABLE "orders"
  ADD COLUMN "qcStatus" "QcReviewStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "qcReviewedAt" TIMESTAMP(3),
  ADD COLUMN "qcReviewNote" VARCHAR(1000),
  ADD COLUMN "qcPhotoFingerprint" VARCHAR(64);

CREATE TABLE "order_qc_reviews" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "userId" TEXT,
  "decision" "QcReviewStatus" NOT NULL,
  "note" VARCHAR(1000),
  "photoFingerprint" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_qc_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_qc_reviews_orderId_createdAt_idx" ON "order_qc_reviews"("orderId", "createdAt");
ALTER TABLE "order_qc_reviews" ADD CONSTRAINT "order_qc_reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_qc_reviews" ADD CONSTRAINT "order_qc_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

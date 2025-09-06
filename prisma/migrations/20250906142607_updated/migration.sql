-- DropForeignKey
ALTER TABLE "public"."ProductReview" DROP CONSTRAINT "ProductReview_productId_fkey";

-- AddForeignKey
ALTER TABLE "public"."ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

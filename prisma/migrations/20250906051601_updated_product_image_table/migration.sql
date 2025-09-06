-- DropForeignKey
ALTER TABLE "public"."Image" DROP CONSTRAINT "Image_productId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Image" ADD CONSTRAINT "Image_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

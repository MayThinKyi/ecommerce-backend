-- DropForeignKey
ALTER TABLE "public"."PostReview" DROP CONSTRAINT "PostReview_postId_fkey";

-- AddForeignKey
ALTER TABLE "public"."PostReview" ADD CONSTRAINT "PostReview_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "public"."Product" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "public"."ProductReview" ADD COLUMN     "status" "public"."CommentStatus" NOT NULL DEFAULT 'APPROVE';

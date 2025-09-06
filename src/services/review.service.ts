import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

const createProductReviewOne = (reviewData: any) => {
  const data = {
    user: {
      connect: { id: reviewData.userId },
    },
    product: {
      connect: { id: reviewData.productId },
    },
    comment: reviewData.comment,
    rating: reviewData.rating,
  };
  return prisma.productReview.create({
    data,
  });
};

const createPostReviewOne = (reviewData: any) => {
  const data: any = {
    user: {
      connect: { id: reviewData.userId },
    },
    post: {
      connect: { id: reviewData.postId },
    },
    rating: reviewData.rating,
    comment: reviewData.comment,
  };
  return prisma.postReview.create({
    data,
  });
};

export { createProductReviewOne, createPostReviewOne };

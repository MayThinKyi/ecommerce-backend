import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient().$extends({
  result: {
    post: {
      updatedAt: {
        needs: { updatedAt: true },
        compute: (post) => {
          return post.updatedAt.toLocaleDateString("en-us", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
        },
      },
      image: {
        needs: { image: true },
        compute: (post) => {
          return `/optimize/${post.image.split(".")[0]}.webp`;
        },
      },
    },
    user: {
      fullName: {
        needs: { firstName: true, lastName: true },
        compute: (user) => {
          return `${user.firstName ?? ""} ${user.lastName ?? ""}`;
        },
      },
    },
    postReview: {
      updatedAt: {
        needs: { updatedAt: true },
        compute: (review) => {
          return `${review.updatedAt.toLocaleDateString("en-us", {
            day: "2-digit",
            weekday: "short",
            year: "numeric",
          })}`;
        },
      },
    },
  },
});
const createPostOne = (postData: any) => {
  const data: any = {
    title: postData.title,
    content: postData.content,
    body: postData.body,
    image: postData.image,
    author: {
      connect: { id: postData.authorId },
    },
    category: {
      connectOrCreate: {
        where: { name: postData.category },
        create: { name: postData.category },
      },
    },
    type: {
      connectOrCreate: {
        where: { name: postData.type },
        create: { name: postData.type },
      },
    },
  };
  if (postData.tags && postData.tags.length > 0) {
    data.tags = {
      connectOrCreate: postData.tags.map((tag: string) => {
        return {
          where: { name: tag },
          create: { name: tag },
        };
      }),
    };
  }

  return prisma.post.create({
    data,
  });
};

const updatePostOne = (id: number, postData: any) => {
  const data: any = {
    title: postData.title,
    content: postData.content,
    body: postData.body,
    author: {
      connect: {
        id: postData.authorId,
      },
    },
    category: {
      connectOrCreate: {
        where: { name: postData.category },
        create: { name: postData.category },
      },
    },
    type: {
      connectOrCreate: {
        where: { name: postData.type },
        create: { name: postData.type },
      },
    },
  };
  if (postData.tags && postData.tags.length > 0) {
    data.tags = {
      set: [],
      connectOrCreate: postData.tags.map((tag: string) => {
        return {
          where: { name: tag },
          create: { name: tag },
        };
      }),
    };
  }
  if (postData.image) data.image = postData.image;
  return prisma.post.update({
    where: { id },
    data,
  });
};

const getPostById = (id: number) => {
  return prisma.post.findUnique({
    where: {
      id,
    },
  });
};

const deletePostById = (id: number) => {
  return prisma.post.delete({
    where: {
      id,
    },
  });
};

const getPostsWithOptions = (options: any) => {
  return prisma.post.findMany({
    ...options,
    select: {
      id: true,
      title: true,
      content: true,
      body: true,
      image: true,
      updatedAt: true,
      author: {
        select: { fullName: true },
      },
      category: { select: { name: true } },
      type: { select: { name: true } },
      tags: { select: { name: true } },
    },
  });
};
const getPostWithRelations = (id: number) => {
  return prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      body: true,
      image: true,
      updatedAt: true,
      author: {
        select: { fullName: true },
      },
      category: { select: { name: true } },
      type: { select: { name: true } },
      tags: { select: { name: true } },
      reviews: {
        select: {
          user: {
            select: { fullName: true },
          },
          rating: true,
          comment: true,
          updatedAt: true,
        },
      },
    },
  });
};

export {
  createPostOne,
  getPostById,
  updatePostOne,
  deletePostById,
  getPostsWithOptions,
  getPostWithRelations,
};

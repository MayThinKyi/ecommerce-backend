import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient().$extends({
  result: {
    product: {
      updatedAt: {
        needs: { updatedAt: true },
        compute: (product) => {
          return product.updatedAt.toLocaleDateString("en-us", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        },
      },
    },
    image: {
      url: {
        needs: { url: true },
        compute: (image) => {
          return `/optimize/${image.url.split(".")[0]}.webp`;
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
    productReview: {
      updatedAt: {
        needs: { updatedAt: true },
        compute: (productReview) => {
          return productReview.updatedAt.toLocaleDateString("en-us", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        },
      },
    },
  },
});

const createProductOne = (productData: any) => {
  const data: any = {
    name: productData.name,
    description: productData.description,
    price: productData.price,
    inventory: productData.inventory,
    category: {
      connectOrCreate: {
        where: { name: productData.category },
        create: { name: productData.category },
      },
    },
    type: {
      connectOrCreate: {
        where: { name: productData.type },
        create: { name: productData.type },
      },
    },
    images: {
      create: productData.images,
    },
  };
  if (productData.tags && productData.tags.length > 0) {
    data.tags = {
      connectOrCreate: productData.tags.map((tag: string) => {
        return {
          where: { name: tag },
          create: { name: tag },
        };
      }),
    };
  }
  return prisma.product.create({
    data,
  });
};

const getProductById = (id: number) => {
  return prisma.product.findUnique({
    where: { id },
    include: { images: true },
  });
};

const updateProductOne = (id: number, productData: any) => {
  const data: any = {
    name: productData.name,
    description: productData.description,
    price: productData.price,
    inventory: productData.inventory,
    category: {
      connectOrCreate: {
        where: { name: productData.category },
        create: { name: productData.category },
      },
    },
    type: {
      connectOrCreate: {
        where: { name: productData.type },
        create: { name: productData.type },
      },
    },
  };
  if (productData.images) {
    data.images = {
      deleteMany: {},
      create: productData.images,
    };
  }
  if (productData.tags && productData.tags.length > 0) {
    data.tags = {
      set: [],
      connectOrCreate: productData.tags.map((tag: string) => {
        return {
          where: { name: tag },
          create: { name: tag },
        };
      }),
    };
  }
  return prisma.product.update({
    where: { id },
    data,
  });
};

const deleteProductOne = (id: number) => {
  return prisma.product.delete({
    where: { id },
  });
};

const getProductsWithOptions = (options: any) => {
  return prisma.product.findMany({
    ...options,
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      inventory: true,
      category: { select: { name: true } },
      type: { select: { name: true } },
      tags: { select: { name: true } },
      images: { select: { url: true } },
      status: true,
      updatedAt: true,
    },
  });
};

const getProductWithRelations = (id: number) => {
  return prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      inventory: true,
      category: { select: { name: true } },
      type: { select: { name: true } },
      tags: { select: { name: true } },
      images: { select: { url: true } },
      status: true,
      likedUsers: {
        select: {
          id: true,
        },
      },
      reviews: {
        select: {
          rating: true,
          comment: true,
          updatedAt: true,
          user: {
            select: {
              fullName: true,
            },
          },
        },
      },
      updatedAt: true,
    },
  });
};

export {
  createProductOne,
  getProductById,
  updateProductOne,
  deleteProductOne,
  getProductsWithOptions,
  getProductWithRelations,
};

import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

const getUsersMany = () => {
  return prisma.user.findMany();
};

const updateUser = (id: number, userData: any) => {
  return prisma.user.update({
    where: { id },
    data: userData,
  });
};

const getAllCategories = () => {
  return prisma.category.findMany();
};

const getAllTypes = () => {
  return prisma.type.findMany();
};

const favouriteProduct = (userId: number, productId: number) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      likedProducts: {
        connect: {
          id: productId,
        },
      },
    },
  });
};

const unFavouriteProduct = (userId: number, productId: number) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      likedProducts: {
        disconnect: {
          id: productId,
        },
      },
    },
  });
};

export {
  getUsersMany,
  updateUser,
  getAllCategories,
  getAllTypes,
  favouriteProduct,
  unFavouriteProduct,
};

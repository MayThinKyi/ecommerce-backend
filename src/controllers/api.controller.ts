import { Request, Response, NextFunction } from "express";
import {
  getPostsWithOptions,
  getPostWithRelations,
} from "../services/post.service";
import { StatusCodes } from "http-status-codes";
import { createError } from "../utils/error";
import { errorCode } from "../../config/errorCode";
import {
  getProductsWithOptions,
  getProductWithRelations,
} from "../services/product.service";
import { getOrSetCache } from "../utils/cache";
import { getAllCategories, getAllTypes } from "../services/user.service";

// Offset Based Pagination
const getAllPostsByPagination = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const skipOperation = (page - 1) * limit;
  const currectPage = page;
  const prevPage = page === 1 ? null : page - 1;
  let hasNextPage = false;
  let nextPage = null;

  const options = {
    skip: skipOperation,
    take: limit + 1, // to check if hasNextPage or not
    orderBy: {
      updatedAt: "desc",
    },
  };
  //   const data = await getPostsWithOptions(options);
  const cacheKey = `posts:${JSON.stringify(req.query)}`;
  const data = await getOrSetCache(cacheKey, async () => {
    return await getPostsWithOptions(options);
  });
  if (data.length > limit) {
    hasNextPage = true;
    nextPage = currectPage + 1;
    data.pop();
  }
  return res.status(StatusCodes.OK).json({
    message: "Retrieved posts successfully.",
    prevPage,
    currectPage,
    hasNextPage,
    nextPage,
    data,
  });
};

// Cursor Based Pagination
const getAllPostsByCursor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const options = {
    skip: 0,
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1, // to check if hasNextPage or not
    orderBy: {
      updatedAt: "desc",
    },
  };
  const currentCursor = cursor ?? null;
  let hasNextCursor = false;
  let nextCursor = null;
  //   const data = await getPostsWithOptions(options);
  const cacheKey = `posts:${JSON.stringify(req.query)}`;
  const data = await getOrSetCache(cacheKey, async () => {
    return await getPostsWithOptions(options);
  });

  if (data.length > limit) {
    hasNextCursor = true;
    nextCursor = data[data.length - 1].id;
    data.pop();
  }
  return res.status(StatusCodes.OK).json({
    message: "Retrieved posts successfully.",
    currentCursor,
    hasNextCursor,
    nextCursor,
    data,
  });
};

const getPost = async (req: Request, res: Response, next: NextFunction) => {
  const postId = req.params.postId ? Number(req.params.postId) : undefined;
  const data = await getPostWithRelations(postId!);
  // const cacheKey = `posts:${JSON.stringify(req.params)}`;
  // const data = await getOrSetCache(cacheKey, async () => {
  //   return await getPostWithRelations(postId!);
  // });
  if (!data) {
    return next(
      createError(
        StatusCodes.NOT_FOUND,
        "Post not found.",
        errorCode.invalid_input
      )
    );
  }
  return res.status(StatusCodes.OK).json({
    message: "Retrieved Post successfully.",
    data,
  });
};

// Offset Based Pagination
const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const search = req.query.search ?? undefined;
  const category = req.query.category ?? undefined;
  const type = req.query.type ?? undefined;
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const skipOperation = (page - 1) * limit;
  const categories = category
    ? (category as string).split(",").map((c) => Number(c))
    : [];
  const types = type ? (type as string).split(",").map((c) => Number(c)) : [];

  const where = {
    AND: [
      search ? { name: { contains: search } } : {},
      categories.length > 0 ? { category: { id: { in: categories } } } : {},
      types.length > 0 ? { type: { id: { in: types } } } : {},
    ],
  };

  const options = {
    where,
    skip: skipOperation,
    take: limit + 1, // to check is hasNextPage or not,
    orderBy: {
      updatedAt: "desc",
    },
  };
  const currentPage = page;
  const prevPage = page === 1 ? null : page - 1;
  let hasNextPage = false;
  let nextPage = null;

  // const data = await getProductsWithOptions(options);
  const cacheKey = `products:${JSON.stringify(req.query)}`;
  const data = await getOrSetCache(cacheKey, async () => {
    return await getProductsWithOptions(options);
  });

  if (data.length > limit) {
    hasNextPage = true;
    nextPage = page + 1;
    data.pop();
  }
  return res.status(StatusCodes.OK).json({
    message: "Retrieved Products successfully.",
    prevPage,
    currentPage,
    hasNextPage,
    nextPage,
    data,
  });
};

// Cursor Based Pagination
const getAllProductsByCursor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const search = req.query.search ?? undefined;
  const category = req.query.category ?? undefined;
  const type = req.query.type ?? undefined;
  const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const categories = category
    ? (category as string).split(",").map((c) => Number(c))
    : [];
  const types = type ? (type as string).split(",").map((c) => Number(c)) : [];

  const where = {
    AND: [
      search ? { name: { contains: search } } : {},
      categories.length > 0 ? { category: { id: { in: categories } } } : {},
      types.length > 0 ? { type: { id: { in: types } } } : {},
    ],
  };
  const options = {
    where,
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1, // to check if is hasNextPage or not
    orderBy: {
      updatedAt: "desc",
    },
  };
  const currentCursor = cursor;
  let hasNextCursor = false;
  let nextCursor = null;
  // const data = await getProductsWithOptions(options);
  const cacheKey = `products:${JSON.stringify(req.query)}`;
  const data = await getOrSetCache(cacheKey, async () => {
    return await getProductsWithOptions(options);
  });
  if (data.length > limit) {
    hasNextCursor = true;
    nextCursor = data[data.length - 1].id;
    data.pop();
  }
  return res.status(StatusCodes.OK).json({
    message: "Retrieved Products successfuly.",
    currentCursor,
    hasNextCursor,
    nextCursor,
    data,
  });
};

const getProduct = async (req: Request, res: Response, next: NextFunction) => {
  const productId = req.params.productId
    ? Number(req.params.productId)
    : undefined;
  // const product = await getProductWithRelations(productId!);
  const cacheKey = `products:${JSON.stringify(req.params)}`;
  const product = await getOrSetCache(cacheKey, async () => {
    return await getProductWithRelations(productId!);
  });
  if (!product) {
    return next(
      createError(
        StatusCodes.NOT_FOUND,
        "Product not found.",
        errorCode.invalid_input
      )
    );
  }
  return res.status(StatusCodes.OK).json({
    message: "Retrieved Product successfully.",
    data: product,
  });
};

const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // const cacheKey = `categories:${JSON.stringify({})}`;
  // const data = await getOrSetCache(cacheKey, async () => {
  //   return await getAllCategories();
  // });
  const data = await getAllCategories();
  return res.status(StatusCodes.OK).json({
    message: "Retrieved Categories successfully.",
    data,
  });
};

const getTypes = async (req: Request, res: Response, next: NextFunction) => {
  // const cacheKey = `types:${JSON.stringify({})}`;
  // const data = await getOrSetCache(cacheKey, async () => {
  //   return await getAllTypes();
  // });
  const data = await getAllTypes();
  return res.status(StatusCodes.OK).json({
    message: "Retrieved Types successfully.",
    data,
  });
};

export {
  getAllPostsByPagination,
  getAllPostsByCursor,
  getPost,
  getAllProducts,
  getAllProductsByCursor,
  getProduct,
  getCategories,
  getTypes,
};

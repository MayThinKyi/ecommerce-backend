import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";
import { createError } from "../utils/error";
import { StatusCodes } from "http-status-codes";
import { errorCode } from "../../config/errorCode";
import path from "path";
import { imageQueue } from "../jobs/queues/imageQueue";
import { getUserById, updateUser } from "../services/auth.service";
import { body, validationResult } from "express-validator";
import { getProductById } from "../services/product.service";
import { favouriteProduct, unFavouriteProduct } from "../services/user.service";
import { generateToken } from "../utils/generate";
import {
  createPostReviewOne,
  createProductReviewOne,
} from "../services/review.service";

const uploadProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const file = req.file;
  if (!file) {
    return next(
      createError(
        StatusCodes.BAD_REQUEST,
        "Profile image is required.",
        errorCode.invalid_input
      )
    );
  }
  const userId = (req as any).userId;
  const user = await getUserById(userId);
  if (!user) {
    return next(
      createError(
        StatusCodes.UNAUTHORIZED,
        "You are not authenticated.Please login.",
        errorCode.unauthenticated
      )
    );
  }

  const filePath = path.join(__dirname, "../../uploads/images/", file.filename);
  const optimizeFilePath = path.join(
    __dirname,
    "../../uploads/optimize/",
    file.filename.split(".")[0] + ".webp"
  );
  await imageQueue.add("optimize-profileImage", {
    filePath,
    optimizeFilePath,
    width: 200,
    height: 200,
    quality: 100,
  });
  const userData = { image: file.filename };
  await updateUser(user.id, userData);
  return res.status(StatusCodes.OK).json({
    message: "Profile uploaded successfully.",
  });
};

const toggleFavouriteProduct = [
  body("productId", "Invalid Product ID").trim().notEmpty().escape(),
  body("favourite", "Invalid Favourite Value")
    .trim()
    .notEmpty()
    .escape()
    .customSanitizer((value) => {
      if (value === "true" || value === "false" || typeof value === "boolean")
        return value;
      throw new Error("Favourite value must be true or false.");
    }),

  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          errors[0].msg,
          errorCode.invalid_input
        )
      );
    }
    const { userId } = req as any;
    let { productId, favourite } = req.body;
    productId = Number(productId);
    favourite =
      favourite === "true" ? true : favourite === "false" ? false : favourite;
    const product = await getProductById(productId);
    if (!product) {
      return next(
        createError(
          StatusCodes.NOT_FOUND,
          "Product not found.",
          errorCode.invalid_input
        )
      );
    }
    if (favourite) {
      await favouriteProduct(userId, productId);
      return res.status(StatusCodes.OK).json({
        message: "Add product to Favourites successfully.",
      });
    }
    await unFavouriteProduct(userId, productId);
    return res.status(StatusCodes.OK).json({
      message: "Remove product from Favourites successfully.",
    });
  },
];

const changePassword = [
  body("oldPassword", "Invalid Old Password.")
    .trim()
    .notEmpty()
    .isLength({ min: 8 }),
  body("newPassword", "Invalid New Password.")
    .trim()
    .notEmpty()
    .isLength({ min: 8 }),
  body("confirmPassword", "Invalid Confirm Password.")
    .trim()
    .notEmpty()
    .isLength({ min: 8 })
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Password confirmation does not match new password");
      }
      return true;
    }),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          errors[0].msg,
          errorCode.invalid_input
        )
      );
    }
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const { userId } = req as any;
    const user = await getUserById(userId);
    if (!user) {
      return next(
        createError(
          StatusCodes.UNAUTHORIZED,
          "You are not authenticated.Please login.",
          errorCode.unauthenticated
        )
      );
    }
    const salt = await bcrypt.genSalt(10);
    const isOldPwMatch = await bcrypt.compare(oldPassword, user?.password);
    if (!isOldPwMatch) {
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "Old password is incorrect.",
          errorCode.invalid_input
        )
      );
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);
    const tempoRefreshToken = generateToken();
    await updateUser(user.id, {
      password: hashedNewPassword,
      refreshToken: tempoRefreshToken,
    });
    res
      .clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 1 * 60 * 1000, // 15 minutes
        path: "/",
      })
      .clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: "/",
      })
      .status(StatusCodes.OK)
      .json({
        message: "Changed Password successfully.Please login again.",
      });
  },
];

const createProductReview = [
  body("productId", "Invalid Product ID").trim().notEmpty().escape(),
  body("comment", "Invalid Comment").trim().notEmpty().escape(),
  body("rating", "Invalid Rating").trim().notEmpty().escape().isInt({ min: 0 }),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          errors[0].msg,
          errorCode.invalid_input
        )
      );
    }
    const { productId, comment, rating } = req.body;
    const { userId } = req as any;
    const user = await getUserById(userId);
    if (!user) {
      return next(
        createError(
          StatusCodes.UNAUTHORIZED,
          "You are not authenticated.Please login.",
          errorCode.unauthenticated
        )
      );
    }
    const reviewData = {
      productId: Number(productId),
      userId,
      comment,
      rating: Number(rating),
    };
    const data = await createProductReviewOne(reviewData);
    return res.status(StatusCodes.CREATED).json({
      message: "Product review created successfully.",
      data,
    });
  },
];

const createPostReview = [
  body("postId", "Invalid Post ID").trim().notEmpty().escape(),
  body("comment", "Invalid Comment").trim().notEmpty().escape(),
  body("rating", "Invalid Rating").trim().notEmpty().escape().isInt({ min: 0 }),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          errors[0].msg,
          errorCode.invalid_input
        )
      );
    }
    const { postId, comment, rating } = req.body;
    const { userId } = req as any;
    const user = await getUserById(userId);
    if (!user) {
      return next(
        createError(
          StatusCodes.UNAUTHORIZED,
          "You are not authenticated.Please login.",
          errorCode.unauthenticated
        )
      );
    }
    const reviewData = {
      postId: Number(postId),
      userId,
      comment,
      rating: Number(rating),
    };
    const data = await createPostReviewOne(reviewData);
    return res.status(StatusCodes.CREATED).json({
      message: "Post review created successfully.",
      data,
    });
  },
];

export {
  uploadProfile,
  toggleFavouriteProduct,
  changePassword,
  createProductReview,
  createPostReview,
};

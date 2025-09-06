import { NextFunction, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { createError } from "../utils/error";
import { StatusCodes } from "http-status-codes";
import { errorCode } from "../../config/errorCode";
import path from "path";
import { deleteImage } from "../utils/imageUtils";
import {
  createProductOne,
  deleteProductOne,
  getProductById,
  getProductsWithOptions,
  updateProductOne,
} from "../services/product.service";
import { imageQueue } from "../jobs/queues/imageQueue";
import { cacheQueue } from "../jobs/queues/cacheQueue";

const createProduct = [
  body("name", "Invalid Name").trim().notEmpty().escape(),
  body("description", "Invalid Description").trim().notEmpty().escape(),
  body("price", "Invalid Price")
    .trim()
    .notEmpty()
    .escape()
    .isDecimal({ decimal_digits: "2" }),
  body("inventory", "Invalid Inventory").trim().notEmpty().escape(),
  body("category", "Invalid Category").trim().notEmpty().escape(),
  body("type", "Invalid Type").trim().notEmpty().escape(),
  body("tags", "Invalid Tags")
    .trim()
    .notEmpty()
    .escape()
    .customSanitizer((value: string) => {
      let valueArray = value.split(",");
      valueArray = valueArray.map((v) => v.trim()).filter((v) => v !== "");
      return valueArray;
    }),

  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const files: any = req.files;
      if (files?.length > 0) {
        for (const file of files) {
          const filePathToDelete = path.join(
            __dirname,
            "../../uploads/images/",
            file.filename
          );
          deleteImage(filePathToDelete);
        }
      }
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          errors[0].msg,
          errorCode.invalid_input
        )
      );
    }
    const files: any = req.files;
    if (files?.length === 0) {
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "Product requires at least 1 image.",
          errorCode.invalid_input
        )
      );
    }
    let images = [];
    for (const file of files) {
      images.push({ url: file.filename });
      const filePath = path.join(
        __dirname,
        "../../uploads/images/",
        file.filename
      );
      const optimizeFilePath = path.join(
        __dirname,
        "../../uploads/optimize/",
        file.filename.split(".")[0] + ".webp"
      );
      await imageQueue.add("optimize-productImage", {
        filePath,
        optimizeFilePath,
        width: 1200,
        height: 630,
        quality: 100,
      });
    }
    const { name, description, price, inventory, category, type, tags } =
      req.body;
    const productData = {
      name,
      description,
      price: +price,
      inventory: +inventory,
      category,
      type,
      tags,
      images,
    };
    const data = await createProductOne(productData);
    await cacheQueue.add("invalidate-productCache", {
      pattern: "products:*",
    });
    return res.status(StatusCodes.CREATED).json({
      message: "Product created successfully.",
      data,
    });
  },
];

const updateProduct = [
  body("name", "Invalid Name").trim().notEmpty().escape(),
  body("description", "Invalid Description").trim().notEmpty().escape(),
  body("price", "Invalid Price")
    .trim()
    .notEmpty()
    .escape()
    .isDecimal({ decimal_digits: "2" }),
  body("inventory", "Invalid Inventory").trim().notEmpty().escape(),
  body("category", "Invalid Category").trim().notEmpty().escape(),
  body("type", "Invalid Type").trim().notEmpty().escape(),
  body("tags", "Invalid Tags")
    .trim()
    .notEmpty()
    .escape()
    .customSanitizer((value: string) => {
      let valueArray = value.split(",");
      valueArray = valueArray.map((v) => v.trim()).filter((v) => v !== "");
      return valueArray;
    }),

  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const files: any = req.files;
      if (files?.length > 0) {
        for (const file of files) {
          const filePathToDelete = path.join(
            __dirname,
            "../../uploads/images/",
            file.filename
          );
          deleteImage(filePathToDelete);
        }
      }
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          errors[0].msg,
          errorCode.invalid_input
        )
      );
    }
    const productId = req.params.productId
      ? Number(req.params.productId)
      : undefined;
    const product = await getProductById(productId!);
    if (!product) {
      const files: any = req.files;
      if (files?.length > 0) {
        for (const file of files) {
          const filePathToDelete = path.join(
            __dirname,
            "../../uploads/images/",
            file.filename
          );
          deleteImage(filePathToDelete);
        }
      }
      return next(
        createError(
          StatusCodes.NOT_FOUND,
          "Product not found.",
          errorCode.invalid_input
        )
      );
    }
    let images = [];
    const files: any = req.files;
    if (files.length > 0) {
      for (const file of files) {
        images.push({ url: file.filename });
        const filePath = path.join(
          __dirname,
          "../../uploads/images/",
          file.filename
        );
        const optimizeFilePath = path.join(
          __dirname,
          "../../uploads/optimize/",
          file.filename.split(".")[0] + ".webp"
        );
        await imageQueue.add("optimize-productImage", {
          filePath,
          optimizeFilePath,
          width: 1200,
          height: 630,
          quality: 100,
        });
      }
      for (const image of product.images) {
        const filePathToDelete = path.join(
          __dirname,
          "../../uploads/images/",
          image.url
        );
        const optimizefilePathToDelete = path.join(
          __dirname,
          "../../uploads/optimize/",
          image.url.split(".")[0] + ".webp"
        );
        deleteImage(filePathToDelete);
        deleteImage(optimizefilePathToDelete);
      }
    }
    const { name, description, price, inventory, category, type, tags } =
      req.body;
    const productData: any = {
      name,
      description,
      price: +price,
      inventory: +inventory,
      category,
      type,
      tags,
    };
    if (images.length > 0) productData.images = images;
    const data = await updateProductOne(product.id, productData);
    await cacheQueue.add("invalidate-productCache", {
      pattern: "products:*",
    });
    return res.status(StatusCodes.OK).json({
      message: "Product updated successfully.",
      data,
    });
  },
];
const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const productId = req.params.productId
    ? Number(req.params.productId)
    : undefined;
  const product = await getProductById(productId!);
  if (!product) {
    return next(
      createError(
        StatusCodes.NOT_FOUND,
        "Product not found.",
        errorCode.invalid_input
      )
    );
  }
  await deleteProductOne(productId!);
  await cacheQueue.add("invalidate-productCache", {
    pattern: "products:*",
  });
  for (const image of product.images) {
    const filePathToDelete = path.join(
      __dirname,
      "../../uploads/images/",
      image.url
    );
    const optimizefilePathToDelete = path.join(
      __dirname,
      "../../uploads/optimize/",
      image.url.split(".")[0] + ".webp"
    );
    deleteImage(filePathToDelete);
    deleteImage(optimizefilePathToDelete);
  }
  return res.status(StatusCodes.OK).json({
    message: "Product deleted successfully.",
  });
};

export { createProduct, updateProduct, deleteProduct };

import { NextFunction, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import sanitize from "sanitize-html";
import { createError } from "../utils/error";
import { StatusCodes } from "http-status-codes";
import { errorCode } from "../../config/errorCode";
import {
  createPostOne,
  deletePostById,
  getPostById,
  updatePostOne,
} from "../services/post.service";
import { deleteImage } from "../utils/imageUtils";
import path from "path";
import { imageQueue } from "../jobs/queues/imageQueue";
import { cacheQueue } from "../jobs/queues/cacheQueue";

const createPost = [
  body("title", "Invalid Title").trim().notEmpty().escape(),
  body("content", "Invalid Content").trim().notEmpty().escape(),
  body("body", "Invalid Body")
    .trim()
    .notEmpty()
    .customSanitizer((value) => sanitize(value)),
  body("category", "Invalid Category").trim().notEmpty().escape(),
  body("type", "Invalid Type").trim().notEmpty().escape(),
  body("tags", "Invalid Tags")
    .trim()
    .notEmpty()
    .escape()
    .customSanitizer((value: string) => {
      let valueArr = value.split(",");
      valueArr = valueArr.map((v) => v.trim()).filter((v) => v !== "");
      return valueArr;
    }),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const file = req.file;

      if (file) {
        const filePathToDelete = path.join(
          __dirname,
          "../../uploads/images",
          file?.filename
        );
        deleteImage(filePathToDelete);
      }
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          errors[0].msg,
          errorCode.invalid_input
        )
      );
    }
    const file = req.file;
    if (!file) {
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "Image is requried.",
          errorCode.invalid_input
        )
      );
    }
    const { userId } = req as any;
    const { title, content, body, category, type, tags } = req.body;
    const postData = {
      title,
      content,
      body,
      image: file.filename,
      authorId: userId,
      category,
      type,
      tags,
    };
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
    await imageQueue.add("optimize-postImage", {
      filePath,
      optimizeFilePath,
      width: 1200,
      height: 630,
      quality: 100,
    });
    const data = await createPostOne(postData);
    await cacheQueue.add("invalidate-postCache", {
      pattern: "posts:*",
    });
    return res.status(StatusCodes.CREATED).json({
      message: "Post created successfully.",
      data,
    });
  },
];

const updatePost = [
  body("title", "Invalid Title").trim().notEmpty().escape(),
  body("content", "Invalid Content").trim().notEmpty().escape(),
  body("body", "Invalid Body")
    .trim()
    .notEmpty()
    .customSanitizer((value) => sanitize(value)),
  body("category", "Invalid Category").trim().notEmpty().escape(),
  body("type", "Invalid Type").trim().notEmpty().escape(),
  body("tags", "Invalid Tags")
    .trim()
    .notEmpty()
    .escape()
    .customSanitizer((value: string) => {
      let valueArr = value.split(",");
      valueArr = valueArr.map((v) => v.trim()).filter((v) => v !== "");
      return valueArr;
    }),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const file = req.file;

      if (file) {
        const filePathToDelete = path.join(
          __dirname,
          "../../uploads/images",
          file?.filename
        );
        deleteImage(filePathToDelete);
      }
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          errors[0].msg,
          errorCode.invalid_input
        )
      );
    }
    const postId = Number(req.params.postId as string);
    const post = await getPostById(postId);
    if (!post) {
      const file = req.file;
      if (file) {
        const filePathToDelete = path.join(
          __dirname,
          "../../uploads/images",
          file?.filename
        );
        deleteImage(filePathToDelete);
      }
      return next(
        createError(
          StatusCodes.NOT_FOUND,
          "Post not found",
          errorCode.invalid_input
        )
      );
    }
    const file = req.file;
    const { userId } = req as any;
    const { title, content, body, category, type, tags } = req.body;
    const postData: any = {
      title,
      content,
      body,
      authorId: userId,
      category,
      type,
      tags,
    };
    if (file) {
      postData.image = file.filename;
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
      await imageQueue.add("optimize-postImage", {
        filePath,
        optimizeFilePath,
        width: 1200,
        height: 630,
        quality: 100,
      });

      const filePathToDelete = path.join(
        __dirname,
        "../../uploads/images/",
        post.image
      );
      const optimizeFilePathToDelete = path.join(
        __dirname,
        "../../uploads/optimize/",
        post.image.split(".")[0] + ".webp"
      );
      deleteImage(filePathToDelete);
      deleteImage(optimizeFilePathToDelete);
    }

    const data = await updatePostOne(post.id, postData);
    await cacheQueue.add("invalidate-postCache", {
      pattern: "posts:*",
    });
    return res.status(StatusCodes.OK).json({
      message: "Post updated successfully.",
      data,
    });
  },
];

const deletePost = async (req: Request, res: Response, next: NextFunction) => {
  const postId = Number(req.params.postId as string);
  const post = await getPostById(postId);
  if (!post) {
    return next(
      createError(
        StatusCodes.NOT_FOUND,
        "Post not found",
        errorCode.invalid_input
      )
    );
  }
  await deletePostById(postId);
  await cacheQueue.add("invalidate-postCache", {
    pattern: "posts:*",
  });
  const filePathToDelete = path.join(
    __dirname,
    "../../uploads/images/",
    post.image
  );
  const optimizeFilePathToDelete = path.join(
    __dirname,
    "../../uploads/optimize/",
    post.image.split(".")[0] + ".webp"
  );
  deleteImage(filePathToDelete);
  deleteImage(optimizeFilePathToDelete);
  return res.status(StatusCodes.OK).json({
    message: "Post deleted successfully.",
  });
};

export { createPost, updatePost, deletePost };

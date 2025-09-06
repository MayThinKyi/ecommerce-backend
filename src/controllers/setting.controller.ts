import { NextFunction, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { createError } from "../utils/error";
import { StatusCodes } from "http-status-codes";
import { errorCode } from "../../config/errorCode";
import { createOrUpdateSetting } from "../services/setting.service";

const setMaintenance = [
  body("mode", "Invalid mode")
    .trim()
    .notEmpty()
    .escape()
    .customSanitizer((value) => {
      if (value === "true" || value === "false") return value;
      else throw new Error("Mode must be true or false value.");
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
    const { mode } = req.body;
    const message =
      mode === "true"
        ? "Maintenance mode turn on successfully."
        : "Maintenance mode turn off successfully.";
    await createOrUpdateSetting("maintenance", mode);
    return res.status(StatusCodes.OK).json({
      message,
    });
  },
];

export { setMaintenance };

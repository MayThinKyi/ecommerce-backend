import { NextFunction, Response, Request } from "express";
import { createError } from "../utils/error";
import { StatusCodes } from "http-status-codes";
import { errorCode } from "../../config/errorCode";
import { getUserById } from "../services/auth.service";

const authorise = (isAllowed: boolean, ...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId ?? undefined;
    if (!userId) {
      return next(
        createError(
          StatusCodes.UNAUTHORIZED,
          "You are not authenticated.Plase login.",
          errorCode.unauthenticated
        )
      );
    }
    const user = await getUserById(userId);
    if (!user) {
      return next(
        createError(
          StatusCodes.UNAUTHORIZED,
          "You are not authenticated.Plase login.",
          errorCode.unauthenticated
        )
      );
    }
    if (isAllowed && !roles.includes(user.role)) {
      return next(
        createError(
          StatusCodes.UNAUTHORIZED,
          "You are not allowed for this request.",
          errorCode.unauthorised
        )
      );
    }
    if (!isAllowed && roles.includes(user.role)) {
      return next(
        createError(
          StatusCodes.UNAUTHORIZED,
          "You are not allowed for this request.",
          errorCode.unauthorised
        )
      );
    }
    return next();
  };
};

export { authorise };

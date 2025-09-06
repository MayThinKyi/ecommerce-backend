import { NextFunction, Request, Response } from "express";
import { createError } from "../utils/error";
import { StatusCodes } from "http-status-codes";
import { errorCode } from "../../config/errorCode";
import jwt from "jsonwebtoken";
import { getUserById, updateUser } from "../services/auth.service";

const auth = async (req: Request, res: Response, next: NextFunction) => {
  // For the api requests from Mobile
  // mobile will need separate /refresh-token api for refreshToken rotation
  const platform = req.headers["x-platform"] ?? null;
  if (platform === "mobile") {
    const accessToken = req.headers["authorization"]?.split(" ")[1];
    console.log("AccessToken form Mobile => ", accessToken);
    return next();
  }

  const accessToken = req.cookies ? req.cookies.accessToken : null;
  const refreshToken = req.cookies ? req.cookies.refreshToken : null;

  if (!refreshToken) {
    return next(
      createError(
        StatusCodes.UNAUTHORIZED,
        "You are not authenticated.Please login.",
        errorCode.unauthenticated
      )
    );
  }

  const refreshTokenRotation = async () => {
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!);
      const { id, phone } = decoded;
      const user = await getUserById(id);
      if (!user) {
        return next(
          createError(
            StatusCodes.NOT_FOUND,
            "Something went wrong.Please login.",
            errorCode.unauthenticated
          )
        );
      }
      if (user.phone !== phone) {
        return next(
          createError(
            StatusCodes.NOT_FOUND,
            "Something went wrong.Please login.",
            errorCode.unauthenticated
          )
        );
      }
      if (user.refreshToken !== refreshToken) {
        return next(
          createError(
            StatusCodes.NOT_FOUND,
            "Something went wrong.Please login.",
            errorCode.unauthenticated
          )
        );
      }
      const newAccessTokenPayload = { id: user.id };
      const newRefreshTokenPayload = { id: user.id, phone: user.phone };
      const newAccessToken = jwt.sign(
        newAccessTokenPayload,
        process.env.ACCESS_TOKEN_SECRET!,
        { expiresIn: "1m" }
      );
      const newRefreshToken = jwt.sign(
        newRefreshTokenPayload,
        process.env.REFRESH_TOKEN_SECRET!,
        {
          expiresIn: "30d",
        }
      );
      await updateUser(user.id, {
        refreshToken: newRefreshToken,
        errorLoginCount: 0,
      });
      res
        .cookie("accessToken", newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 1 * 60 * 1000, // 15 minutes
          path: "/",
        })
        .cookie("refreshToken", newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          path: "/",
        });
      (req as any).userId = decoded.id;
      return next();
    } catch (error) {
      return next(
        createError(
          StatusCodes.UNAUTHORIZED,
          "RefreshToken is invalid.Please login.",
          errorCode.unauthenticated
        )
      );
    }
  };
  if (!accessToken) {
    // RefreshToken rotation
    return refreshTokenRotation();
    // return next(
    //   createError(
    //     StatusCodes.UNAUTHORIZED,
    //     "AccessToken is expired.",
    //     errorCode.unauthenticated
    //   )
    // );
  }
  let decoded: any;
  try {
    decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!);
    (req as any).userId = decoded.id;
    return next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      // RefreshToken rotation
      return refreshTokenRotation();

      //   return next(
      //     createError(
      //       StatusCodes.UNAUTHORIZED,
      //       "AccessToken is expired.",
      //       errorCode.unauthenticated
      //     )
      //   );
    }
    return next(
      createError(
        StatusCodes.UNAUTHORIZED,
        "AccessToken is invalid.",
        errorCode.unauthenticated
      )
    );
  }
};

export { auth };

import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { createError } from "../utils/error";
import StatusCodes from "http-status-codes";
import { errorCode } from "../../config/errorCode";
import {
  createOTP,
  createUser,
  getOTPByPhone,
  getUserById,
  getUserByPhone,
  updateOTP,
  updateUser,
} from "../services/auth.service";
import { generateOTP, generateToken } from "../utils/generate";
import bcrypt from "bcrypt";
import moment from "moment";
import jwt from "jsonwebtoken";
import { decode } from "punycode";

const myanmarPhoneRegex = /^(09|\+?950?9|\+?95950?9)\d{7,9}$/;
const register = [
  body("phone", "Invalid Phone").custom((value) => {
    if (!myanmarPhoneRegex.test(value)) {
      throw new Error("Invalid Myanmar phone number format.");
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
    let phone = req.body.phone as string;
    if (phone.slice(0, 2) === "09") {
      phone = phone.slice(2, phone.length);
    }
    const user = await getUserByPhone(phone);
    if (user) {
      return next(
        createError(
          StatusCodes.CONFLICT,
          "Phone already registered.",
          errorCode.invalid_input
        )
      );
    }
    const otpHistory = await getOTPByPhone(phone);
    // const otp = generateOTP();
    const otp = 123456;
    const salt = await bcrypt.genSalt(10);
    const hashedOTP = await bcrypt.hash(otp.toString(), salt);
    const rememberToken = generateToken();
    if (!otpHistory) {
      await createOTP({
        otp: hashedOTP,
        phone,
        rememberToken,
        count: 1,
      });
      return res.status(StatusCodes.OK).json({
        message: `OTP is sending to phone 09${phone}.`,
        token: rememberToken,
        phone,
      });
    }
    const isSameDate =
      otpHistory.updatedAt.toLocaleDateString() ===
      new Date().toLocaleDateString();
    if (!isSameDate) {
      const otpData = {
        otp: hashedOTP,
        rememberToken,
        count: 1,
        errorCount: 0,
      };
      await updateOTP(otpHistory.id, otpData);
      return res.status(StatusCodes.OK).json({
        message: `OTP is sending to phone 09${phone}.`,
        token: rememberToken,
        phone,
      });
    }
    if (otpHistory.count === 3) {
      return next(
        createError(
          StatusCodes.METHOD_NOT_ALLOWED,
          "OTP was requested for 3 times today.Please try again tomorrow.",
          errorCode.method_not_allowed
        )
      );
    }
    if (otpHistory.errorCount === 5) {
      return next(
        createError(
          StatusCodes.METHOD_NOT_ALLOWED,
          "OTP was wrong for 5 times today.Please try again tomorrow.",
          errorCode.method_not_allowed
        )
      );
    }
    const otpData = {
      otp: hashedOTP,
      rememberToken,
      count: { increment: 1 },
      errorCount: 0,
    };
    await updateOTP(otpHistory.id, otpData);
    return res.status(StatusCodes.OK).json({
      message: `OTP is sending to phone 09${phone}.`,
      token: rememberToken,
      phone,
    });
  },
];

const verifyOtp = [
  body("phone", "Invalid Phone"),
  body("token", "Invalid token"),
  body("otp", "Invalid OTP").isLength({ min: 6, max: 6 }),
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
    const { token, otp } = req.body;
    let phone = req.body.phone as string;
    if (phone.slice(0, 2) === "09") {
      phone = phone.slice(2, phone.length);
    }
    const user = await getUserByPhone(phone);
    if (user) {
      return next(
        createError(
          StatusCodes.CONFLICT,
          "Phone already registered.",
          errorCode.invalid_input
        )
      );
    }
    const otpHistory = await getOTPByPhone(phone);
    if (!otpHistory) {
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "Phone is incorrect.",
          errorCode.method_not_allowed
        )
      );
    }
    if (otpHistory.rememberToken !== token) {
      const otpData = { errorCount: 5 };
      await updateOTP(otpHistory.id, otpData);
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "You are not allowed for this request.",
          errorCode.method_not_allowed
        )
      );
    }
    const isOTPExpired = moment().diff(otpHistory.updatedAt, "minutes") > 30;
    if (isOTPExpired) {
      return next(
        createError(
          StatusCodes.REQUEST_TIMEOUT,
          "OTP was expired.",
          errorCode.otp_expired
        )
      );
    }
    if (otpHistory.errorCount === 5) {
      return next(
        createError(
          StatusCodes.METHOD_NOT_ALLOWED,
          "OTP was wrong for 5 times today.Please try again tomorrow.",
          errorCode.method_not_allowed
        )
      );
    }
    const isMatchOTP = await bcrypt.compare(otp, otpHistory.otp);
    if (!isMatchOTP) {
      const otpData = { errorCount: { increment: 1 } };
      await updateOTP(otpHistory.id, otpData);
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "OTP is incorrect.",
          errorCode.invalid_input
        )
      );
    }
    const verifyToken = generateToken();
    const otpData = {
      count: 1,
      errorCount: 0,
      verifyToken,
    };
    await updateOTP(otpHistory.id, otpData);
    return res.status(StatusCodes.OK).json({
      message: "OTP verification is success.",
      phone,
      token: verifyToken,
    });
  },
];

const confirmPassword = [
  body("phone", "Invalid Phone"),
  body("token", "Invalid token"),
  body("password", "Invalid Password").isLength({ min: 8 }),
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
    const { token, password } = req.body;
    let phone = req.body.phone as string;
    if (phone.slice(0, 2) === "09") {
      phone = phone.slice(2, phone.length);
    }
    const user = await getUserByPhone(phone);
    if (user) {
      return next(
        createError(
          StatusCodes.CONFLICT,
          "Phone already registered.",
          errorCode.invalid_input
        )
      );
    }
    const otpHistory = await getOTPByPhone(phone);
    if (!otpHistory) {
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "Phone is incorrect.",
          errorCode.method_not_allowed
        )
      );
    }
    if (otpHistory.verifyToken !== token) {
      const otpData = { errorCount: 5 };
      await updateOTP(otpHistory.id, otpData);
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "You are not allowed for this request.",
          errorCode.method_not_allowed
        )
      );
    }
    const isRequestExpired =
      moment().diff(otpHistory.updatedAt, "minutes") > 30;
    if (isRequestExpired) {
      return next(
        createError(
          StatusCodes.REQUEST_TIMEOUT,
          "Request was expired.",
          errorCode.request_expired
        )
      );
    }
    if (otpHistory.errorCount === 5) {
      return next(
        createError(
          StatusCodes.METHOD_NOT_ALLOWED,
          "OTP was wrong for 5 times today.Please try again tomorrow.",
          errorCode.method_not_allowed
        )
      );
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // temporary token , since refreshToken need user.id => create user than update refreshToken
    const tempoRefreshToken = generateToken();
    const userData = {
      refreshToken: tempoRefreshToken,
      phone,
      password: hashedPassword,
    };
    const data = await createUser(userData);
    const accessTokenPayload = { id: data.id };
    const refreshTokenPayload = { id: data.id, phone: data.phone };
    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.ACCESS_TOKEN_SECRET!,
      { expiresIn: "1m" }
    );
    const refreshToken = jwt.sign(
      refreshTokenPayload,
      process.env.REFRESH_TOKEN_SECRET!,
      {
        expiresIn: "30d",
      }
    );
    await updateUser(data.id, { refreshToken });
    res
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 1 * 60 * 1000, // 15 minutes
        path: "/",
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: "/",
      })
      .status(StatusCodes.CREATED)
      .json({
        message: "User created successfuly.",
      });
  },
];

const login = [
  body("phone", "Invalid Phone"),
  body("password", "Invalid Password").isLength({ min: 8 }),
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
    const { password } = req.body;
    let phone = req.body.phone as string;
    if (phone.slice(0, 2) === "09") {
      phone = phone.slice(2, phone.length);
    }
    const user = await getUserByPhone(phone);
    if (!user) {
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "Phone is not registered.",
          errorCode.invalid_input
        )
      );
    }
    if (user.status === "FREEZE") {
      return next(
        createError(
          StatusCodes.METHOD_NOT_ALLOWED,
          "You account is temporarily locked.Please contact us.",
          errorCode.method_not_allowed
        )
      );
    }
    const isSameDate =
      user.updatedAt.toLocaleDateString() === new Date().toLocaleDateString();
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (isSameDate) {
      if (user.errorLoginCount === 5) {
        return next(
          createError(
            StatusCodes.METHOD_NOT_ALLOWED,
            "Your login credentails was wrong for 5 times today.Please try again tomorrow.",
            errorCode.method_not_allowed
          )
        );
      }
      if (!isPasswordMatch) {
        if (user.errorLoginCount > 3) {
          const userData = {
            errorLoginCount: { increment: 1 },
            status: "FREEZE",
          };
          await updateUser(user.id, userData);
          return next(
            createError(
              StatusCodes.BAD_REQUEST,
              "Password is incorrect.",
              errorCode.invalid_input
            )
          );
        }
        const userData = { errorLoginCount: { increment: 1 } };
        await updateUser(user.id, userData);
        return next(
          createError(
            StatusCodes.BAD_REQUEST,
            "Password is incorrect.",
            errorCode.invalid_input
          )
        );
      }
    }
    if (!isPasswordMatch) {
      const userData = { errorLoginCount: 1 };
      await updateUser(user.id, userData);
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "Password is incorrect.",
          errorCode.invalid_input
        )
      );
    }
    const accessTokenPayload = { id: user.id };
    const refreshTokenPayload = { id: user.id, phone: user.phone };
    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.ACCESS_TOKEN_SECRET!,
      { expiresIn: "1m" }
    );
    const refreshToken = jwt.sign(
      refreshTokenPayload,
      process.env.REFRESH_TOKEN_SECRET!,
      {
        expiresIn: "30d",
      }
    );
    await updateUser(user.id, { refreshToken, errorLoginCount: 0 });
    res
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 1 * 60 * 1000, // 15 minutes
        path: "/",
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: "/",
      })
      .status(StatusCodes.OK)
      .json({
        message: "User login successfuly.",
      });
  },
];

const logout = async (req: Request, res: Response, next: NextFunction) => {
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
  let decoded: any;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!);
  } catch (error) {
    return next(
      createError(
        StatusCodes.UNAUTHORIZED,
        "RefreshToken is invalid.Please login.",
        errorCode.unauthenticated
      )
    );
  }
  const userId = decoded.id;
  const tempoRefreshToken = generateToken();
  await updateUser(userId, { refreshToken: tempoRefreshToken });
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
      message: "User logout successfully.",
    });
};

const forgetPassword = [
  body("phone", "Invalid Phone").custom((value) => {
    if (!myanmarPhoneRegex.test(value)) {
      throw new Error("Invalid Myanmar phone number format.");
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
    let phone = req.body.phone as string;
    if (phone.slice(0, 2) === "09") {
      phone = phone.slice(2, phone.length);
    }
    const user = await getUserByPhone(phone);
    if (!user) {
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "Phone is not registered.",
          errorCode.invalid_input
        )
      );
    }
    if (user.status === "FREEZE") {
      return next(
        createError(
          StatusCodes.METHOD_NOT_ALLOWED,
          "Your account is temporarily locked.Please contact us.",
          errorCode.method_not_allowed
        )
      );
    }
    const otpHistory = await getOTPByPhone(phone);
    if (!otpHistory) {
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "Phone is incorrect.",
          errorCode.invalid_input
        )
      );
    }
    const isSameDate =
      otpHistory.updatedAt.toLocaleDateString() ===
      new Date().toLocaleDateString();
    // const otp = generateOTP();
    const otp = 123456;
    const salt = await bcrypt.genSalt(10);
    const hashedOTP = await bcrypt.hash(otp.toString(), salt);
    const rememberToken = generateToken();
    if (!isSameDate) {
      const otpData = {
        otp: hashedOTP,
        rememberToken,
        count: 1,
        errorCount: 0,
      };
      await updateOTP(otpHistory.id, otpData);
      return res.status(StatusCodes.OK).json({
        message: `OTP is sending to phone 09${phone}.`,
        token: rememberToken,
      });
    }
    if (otpHistory.count === 3) {
      return next(
        createError(
          StatusCodes.METHOD_NOT_ALLOWED,
          "OTP was requested 3 times for today.Please try again tomorrow.",
          errorCode.method_not_allowed
        )
      );
    }
    if (otpHistory.errorCount === 5) {
      return next(
        createError(
          StatusCodes.METHOD_NOT_ALLOWED,
          "OTP was wrong 5 times for today.Please try again tomorrow.",
          errorCode.method_not_allowed
        )
      );
    }
    const otpData = {
      otp: hashedOTP,
      rememberToken,
      count: { increment: 1 },
      errorCount: 0,
    };
    await updateOTP(otpHistory.id, otpData);
    return res.status(StatusCodes.OK).json({
      message: `OTP is sending to phone 09${phone}.`,
      token: rememberToken,
    });
  },
];

const verifyResetOTP = [
  body("phone", "Invalid Phone"),
  body("token", "Invalid token"),
  body("otp", "Invalid OTP").isLength({ min: 6, max: 6 }),
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
    const { token, otp } = req.body;
    let phone = req.body.phone as string;
    if (phone.slice(0, 2) === "09") {
      phone = phone.slice(2, phone.length);
    }
    const user = await getUserByPhone(phone);
    if (!user) {
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "Phone is not registered.",
          errorCode.invalid_input
        )
      );
    }
    if (user.status === "FREEZE") {
      return next(
        createError(
          StatusCodes.METHOD_NOT_ALLOWED,
          "Your account is temporarily locked.Please contact us.",
          errorCode.method_not_allowed
        )
      );
    }
    const otpHistory = await getOTPByPhone(phone);
    if (!otpHistory) {
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "Phone is incorrect.",
          errorCode.invalid_input
        )
      );
    }
    if (otpHistory.rememberToken !== token) {
      const otpData = { errorCount: 5 };
      await updateOTP(otpHistory.id, otpData);
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "You are not allowed for this request.Please try again tomorrow.",
          errorCode.invalid_input
        )
      );
    }
    const isOTPExpired = moment().diff(otpHistory.updatedAt, "minutes") > 30;
    if (isOTPExpired) {
      return next(
        createError(
          StatusCodes.METHOD_NOT_ALLOWED,
          "OTP was expired.",
          errorCode.otp_expired
        )
      );
    }
    if (otpHistory.errorCount === 5) {
      return next(
        createError(
          StatusCodes.METHOD_NOT_ALLOWED,
          "OTP was wrong 5 times for today.Please try again tomorrow.",
          errorCode.method_not_allowed
        )
      );
    }
    const isMatchOTP = await bcrypt.compare(otp, otpHistory.otp);
    if (!isMatchOTP) {
      const otpData = { errorCount: { increment: 1 } };
      await updateOTP(otpHistory.id, otpData);
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "OTP is incorrect.",
          errorCode.invalid_input
        )
      );
    }
    const verifyToken = generateToken();
    const otpData = { count: 1, errorCount: 0, verifyToken };
    await updateOTP(otpHistory.id, otpData);
    return res.status(StatusCodes.OK).json({
      message: "OTP verification is success.",
      token: verifyToken,
    });
  },
];

const resetPassword = [
  body("phone", "Invalid Phone"),
  body("token", "Invalid token"),
  body("password", "Invalid Password").isLength({ min: 8 }),
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
    const { token, password } = req.body;
    let phone = req.body.phone as string;
    if (phone.slice(0, 2) === "09") {
      phone = phone.slice(2, phone.length);
    }
    const user = await getUserByPhone(phone);
    if (!user) {
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "Phone is not registered.",
          errorCode.invalid_input
        )
      );
    }
    if (user.status === "FREEZE") {
      return next(
        createError(
          StatusCodes.METHOD_NOT_ALLOWED,
          "Your account is temporarily locked.Please contact us.",
          errorCode.method_not_allowed
        )
      );
    }
    const otpHistory = await getOTPByPhone(phone);
    if (!otpHistory) {
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "Phone is incorrect.",
          errorCode.invalid_input
        )
      );
    }
    if (otpHistory.verifyToken !== token) {
      const otpData = { errorCount: 5 };
      await updateOTP(otpHistory.id, otpData);
      return next(
        createError(
          StatusCodes.BAD_REQUEST,
          "You are not allowed for this request.Please try again tomorrow.",
          errorCode.invalid_input
        )
      );
    }
    const isRequestExpired =
      moment().diff(otpHistory.updatedAt, "minutes") > 30;
    if (isRequestExpired) {
      return next(
        createError(
          StatusCodes.METHOD_NOT_ALLOWED,
          "Request was expired.",
          errorCode.request_expired
        )
      );
    }
    if (otpHistory.errorCount === 5) {
      return next(
        createError(
          StatusCodes.METHOD_NOT_ALLOWED,
          "OTP was wrong 5 times for today.Please try again tomorrow.",
          errorCode.method_not_allowed
        )
      );
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const tempoRefreshToken = generateToken();
    const userData = {
      password: hashedPassword,
      errorLoginCount: 0,
      refreshToken: tempoRefreshToken,
    };
    await updateUser(user.id, userData);
    return res.status(StatusCodes.OK).json({
      message: "Reset password successfully.",
    });
  },
];

const authCheck = async (req: Request, res: Response, next: NextFunction) => {
  const refreshToken = req.cookies ? req.cookies.refreshToken : null;
  if (!refreshToken) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: "You are not logged in.",
    });
  }
  let decoded: any;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!);
  } catch (error) {
    console.log(error);
  }

  const user = await getUserById(decoded.id);
  if (!user) {
    return next(
      createError(
        StatusCodes.UNAUTHORIZED,
        "You are not authenticated.Please login.",
        errorCode.unauthenticated
      )
    );
  }
  return res.status(StatusCodes.OK).json({
    message: "You are loggedin.",
  });
};

export {
  register,
  verifyOtp,
  confirmPassword,
  login,
  logout,
  forgetPassword,
  verifyResetOTP,
  resetPassword,
  authCheck,
};

import { Router } from "express";
import {
  authCheck,
  confirmPassword,
  forgetPassword,
  login,
  logout,
  register,
  resetPassword,
  verifyOtp,
  verifyResetOTP,
} from "../controllers/auth.controller";
import { auth } from "../middlewares/auth";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/confirm-password", confirmPassword);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forget-password", forgetPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);
router.get("/auth-check", authCheck);

export { router as AuthRoutes };

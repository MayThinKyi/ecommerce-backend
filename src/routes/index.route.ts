import { Router } from "express";
import { AuthRoutes } from "./auth.route";
import { AdminRoutes } from "./admin.route";
import { auth } from "../middlewares/auth";
import { authorise } from "../middlewares/authorise";
import { ApiRoutes } from "./api.route";

const router = Router();

router.use("/admin", auth, authorise(true, "ADMIN"), AdminRoutes);
router.use(AuthRoutes);
router.use(ApiRoutes);

export { router as AppRoutes };

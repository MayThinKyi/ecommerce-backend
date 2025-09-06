import { Router } from "express";
import { getAllUsers } from "../controllers/admin.controller";
import {
  createPost,
  deletePost,
  updatePost,
} from "../controllers/post.controller";
import { upload } from "../middlewares/uploadFile";
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "../controllers/product.controller";
import { setMaintenance } from "../controllers/setting.controller";

const router = Router();

router.get("/users", getAllUsers);
router.post("/posts", upload.single("image"), createPost);
router.patch("/posts/:postId", upload.single("image"), updatePost);
router.delete("/posts/:postId", deletePost);
router.post("/products", upload.array("images"), createProduct);
router.patch("/products/:productId", upload.array("images"), updateProduct);
router.delete("/products/:productId", deleteProduct);
router.post("/maintenance", setMaintenance);

export { router as AdminRoutes };

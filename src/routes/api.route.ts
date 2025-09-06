import { Router } from "express";
import { auth } from "../middlewares/auth";
import { upload } from "../middlewares/uploadFile";
import {
  changePassword,
  createPostReview,
  createProductReview,
  toggleFavouriteProduct,
  uploadProfile,
} from "../controllers/user.controller";
import {
  getAllPostsByCursor,
  getAllPostsByPagination,
  getAllProducts,
  getAllProductsByCursor,
  getCategories,
  getPost,
  getProduct,
  getTypes,
} from "../controllers/api.controller";
import { getAllCategories, getAllTypes } from "../services/user.service";

const router = Router();

router.patch("/upload-profile", auth, upload.single("profile"), uploadProfile);
router.get("/posts", getAllPostsByPagination);
router.get("/posts/infinite", getAllPostsByCursor);
router.get("/posts/:postId", getPost);
router.get("/products", getAllProducts);
router.get("/products/infinite", getAllProductsByCursor);
router.get("/products/:productId", getProduct);
router.get("/categories", getCategories);
router.get("/types", getTypes);
router.patch("/products/favourite", auth, toggleFavouriteProduct);
router.patch("/change-password", auth, changePassword);
router.post("/product-review", auth, createProductReview);
router.post("/post-review", auth, createPostReview);

export { router as ApiRoutes };

import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateUserAvtar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.route("/register").post(
  await upload.fields([
    { name: "avtar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);
userRouter.route("/login").post(loginUser);
//secured routes
userRouter.route("/logout").post(verifyJwt, logoutUser);
userRouter.route("/refresh-token").post(refreshAccessToken);
userRouter.route("/change-password").post(verifyJwt, changeCurrentPassword);
userRouter.route("/get-user").get(verifyJwt, getCurrentUser);
userRouter.route("/update-account").post(verifyJwt, updateAccountDetails);
userRouter
  .route("/update-avtar")
  .post(
    await upload.fields({ name: "avtar", maxCount: 1 }),
    verifyJwt,
    updateUserAvtar
  );
userRouter
  .route("/update-coverImage")
  .post(
    await upload.fields({ name: "coverImage", maxCount: 1 }),
    verifyJwt,
    updateUserCoverImage
  );

export { userRouter };

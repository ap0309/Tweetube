import { Router } from "express";
import {upload} from '../middlewares/multer.middleware.js'
import {addVideoToWatchHistory , getWatchHistory , getUserChannelProfile , updateUserCoverImage , updateUserAvatar , loginUser, logoutUser, refreshAccessToken, registerUser , changeCurrentPassword , updateAccountDetails,getCurrentUser  } from "../controllers/user.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const userRouter = Router()
userRouter.route("/register").post(
    upload.fields([
        { name: "avtar", maxCount: 1 }, 
        { name: "coverImage", maxCount: 1 }
    ]),
    (req, res, next) => {
        console.log("Files:", req.files); 
        console.log("Body:", req.body);
        next();  
    },
    registerUser
);

userRouter.route( "/login" ).post(loginUser);

userRouter.route( "/logout" ).post( verifyJwt ,  logoutUser);

userRouter.route("/refresh-token").post(refreshAccessToken);
userRouter.route("/change-password").post(verifyJwt, changeCurrentPassword);
userRouter.route("/current-user").get(verifyJwt, getCurrentUser);
userRouter.route("/update-account").patch(verifyJwt, updateAccountDetails);

userRouter.route("/avatar").patch(verifyJwt, upload.single("avatar"), updateUserAvatar);
userRouter.route("/cover-image").patch(verifyJwt, upload.single("coverImage"), updateUserCoverImage);

userRouter.route("/c/:username").get(verifyJwt, getUserChannelProfile);
userRouter.route("/history").get(verifyJwt, getWatchHistory);
userRouter.route("/addVideoToWatchHistory").post(verifyJwt, addVideoToWatchHistory);

export default userRouter


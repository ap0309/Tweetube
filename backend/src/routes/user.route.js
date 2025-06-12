import {Router} from "express"
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJwt } from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.route("/register").post(
    await upload.fields([
        {
            name :"avtar",
            maxCount : 1
        },
        {
            name : "coverImage",
            maxCount : 1
        }
    ]),
    registerUser
);

userRouter.route("/login").post(loginUser)

//secured routes
userRouter.route("/logout").post(verifyJwt,logoutUser)

userRouter.route("/refresh-token").post(refreshAccessToken)


export {userRouter}; 
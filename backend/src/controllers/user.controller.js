import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
const registerUser = asyncHandler( 
    async(req,res)=>{
       const {username , email , fullname ,password} = req.body
    //    console.log("username: " , username);
    //    console.log("email : " , email);
    //    console.log("fullname : " , fullname);
    //    console.log("password: " , password);
    if (
        [fullname,email,username,password].some((field) => field?.trim === "")
    ){
            throw new ApiError(400,"All fields required");
        }
    const userExists = User.findOne({
        $or : [{username} , {email}]
    })
    if(userExists){
        throw new ApiError(409,"Account with this username or email exists")
    }
    console.log(req.body)
    console.log(req.files)
    const avatarLocalpath = req.files?.avatar[0]?.path;
    const coverImageLocalpath = req.files?.coverImage[0]?.path;

    if(!avatarLocalpath){
        throw new ApiError(400 , "Avatar file is required !")
    }

    const avtar  = await uploadOnCloudinary(avatarLocalpath)
    const coverImage = "";
    if(coverImageLocalpath) coverImage = await uploadOnCloudinary(coverImageLocalpath);
    if(!avtar)throw new ApiError(400 , "Avatar file is required !")
    
    const user = await User.create({
        fullname,
        avtar : avtar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

    const CreatedUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if(!CreatedUser){
        throw new ApiError(500,"Something went wrong while registering");
    }

    return res.status(201).json(
        new ApiResponse(201,CreatedUser, "user registered successfully")
    )
    }
)

export {registerUser}
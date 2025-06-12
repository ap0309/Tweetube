import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { ref } from "process"

const generateAccessAndRefreshTokens = async(userID)=>{
    try{
       const user =  await User.findById(userID);
       const accessToken = user.generateAccessToken();
       const refreshToken = user.generateRefreshToken();

       user.refreshToken = refreshToken
       await user.save({validateBeforeSave: false})

       return {accessToken , refreshToken}
    }catch(err){
        throw new ApiError(500 , err)
    }
}

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
    const userExists = await User.findOne({
        $or : [{username} , {email}]
    })
    if(userExists){
        throw new ApiError(409,"Account with this username or email exists")
    }
    // console.log("reqbody: ",req.body)
    // console.log("reqfiles: ",req.files)

    const avtarLocalpath = req.files?.avtar[0]?.path;
   let coverImageLocalpath = "";

    if (req.files?.coverImage?.[0]?.path) {
    coverImageLocalpath = req.files.coverImage[0].path;
    }

    if(!avtarLocalpath){
        throw new ApiError(400 , "Avtar file is required !")
    }

    const avtar  = await uploadOnCloudinary(avtarLocalpath)
    let coverImage = "";
    if(coverImageLocalpath) coverImage = await uploadOnCloudinary(coverImageLocalpath);
    if(!avtar)throw new ApiError(400 , "Avtar file is required !")
    
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

const loginUser = asyncHandler(
    async(req,res)=>{
        const {username , email , password} = req.body
        if(!username &&  !email) throw new ApiError(400,"Username or Email is required")
        
        const user = await User.findOne({$or : [{username},{email}]})
        if(!user) throw new ApiError(404, "User does not exist");

       const isPasswordValid = await user.isPasswordCorrect(password)
       if(!isPasswordValid) throw new ApiError(404, "Password is incorrect");

       // we will gen acc and ref many tokens so making a method
       console.log(user);
       const {accessToken , refreshToken} = await generateAccessAndRefreshTokens(user._id)
       // now send back these tokens in form of cookies

       const loggedInUser = await User.findById(user._id).select("-password -refresToken")

       // before sending cookies we make options its a object
       const options = {
        httpOnly: true ,
        secure : true
       }

       return res
       .status(200)
       .cookie("accessToken",accessToken, options)
       .cookie("refreshToken" , refreshToken, options)
       .json(
        new ApiResponse(200,{
            user : loggedInUser , accessToken , refreshToken
        },"User Logged In successfully ")
       )


    }
)

const logoutUser = asyncHandler(
    async(req,res) =>{
        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                $set : {
                    refreshToken : undefined
                }
            },
            {new : true}    
        );

    const options = {
        httpOnly: true ,
        secure : true
    }
    res.status(200)
    .clearCookie("accessToken" ,options)
    .clearCookie("refreshToken" ,options)
    .json(
        new ApiResponse(200,{}, "User Logged Out")
    )

    }
)
export {registerUser,
    loginUser,
    logoutUser
}

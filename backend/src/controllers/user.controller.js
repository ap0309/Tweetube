import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ref } from "process";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userID) => {
  try {
    const user = await User.findById(userID);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(500, err);
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullname, password } = req.body;
  //    console.log("username: " , username);
  //    console.log("email : " , email);
  //    console.log("fullname : " , fullname);
  //    console.log("password: " , password);
  if (
    [fullname, email, username, password].some((field) => field?.trim === "")
  ) {
    throw new ApiError(400, "All fields required");
  }
  const userExists = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (userExists) {
    throw new ApiError(409, "Account with this username or email exists");
  }
  // console.log("reqbody: ",req.body)
  // console.log("reqfiles: ",req.files)

  const avtarLocalpath = req.files?.avtar[0]?.path;
  let coverImageLocalpath = "";

  if (req.files?.coverImage?.[0]?.path) {
    coverImageLocalpath = req.files.coverImage[0].path;
  }

  if (!avtarLocalpath) {
    throw new ApiError(400, "Avtar file is required !");
  }

  const avtar = await uploadOnCloudinary(avtarLocalpath);
  let coverImage = "";
  if (coverImageLocalpath)
    coverImage = await uploadOnCloudinary(coverImageLocalpath);
  if (!avtar) throw new ApiError(400, "Avtar file is required !");

  const user = await User.create({
    fullname,
    avtar: avtar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const CreatedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!CreatedUser) {
    throw new ApiError(500, "Something went wrong while registering");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, CreatedUser, "user registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username && !email)
    throw new ApiError(400, "Username or Email is required");

  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) throw new ApiError(404, "User does not exist");

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(404, "Password is incorrect");

  // we will gen acc and ref many tokens so making a method
  console.log(user);
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  // now send back these tokens in form of cookies

  const loggedInUser = await User.findById(user._id).select(
    "-password -refresToken"
  );

  // before sending cookies we make options its a object
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged In successfully "
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorised Request");

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.ACCESS_TOKEN_SECRET
    );
    const user = User.findById(decodedToken._id);
    if (!user) throw new ApiError(401, "Invalid refresh token");
    if (incomingRefreshToken !== user?.refreshToken)
      throw new ApiError(401, "Invalid refresh token or expired");

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newrefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(202)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        new ApiResponse(
          202,
          { accessToken, refreshToken: newrefreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(501, error);
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) throw new ApiError(400, "Incorrect Password");
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, "Password Changed Succesfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(400, "User not found");
  return res.statur(200).json(new ApiResponse(200, user));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname && !email) {
    throw new ApiError(
      400,
      "At least one field (fullname or email) is required"
    );
  }

  const updateData = {};
  if (fullname) updateData.fullname = fullname;
  if (email) updateData.email = email;

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select("-password");

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Account details updated successfully")
    );
});

const updateUserAvtar = asyncHandler(async (req, res) => {
  const newAvtarLocalpath = req.files?.avtar[0]?.path;
  if (!newAvtarLocalpath) throw new ApiError(400, " Avtar file missing");
  const newAvtar = await uploadOnCloudinary(newAvtarLocalpath);
  if (!newAvtar.url) {
    throw new ApiError(500, "Issue while Uploading on Cloudinary");
  }
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { avtar: newAvtar.url },
    },
    { new: true }
  ).select("-password");

  if (!updatedUser) throw new ApiError(400, "User not found");
  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avtar updated Successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const newCoverImageLocalpath = req.files?.coverImage?.[0]?.path;
  if (!newCoverImageLocalpath)
    throw new ApiError(400, " CoverImage file missing");
  const newCoverImage = await uploadOnCloudinary(newAvtarLocalpath);
  if (!newCoverImage.url) {
    throw new ApiError(500, "Issue while Uploading on Cloudinary");
  }
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { coverImage: newCoverImage.url },
    },
    { new: true }
  ).select("-password");

  if (!updatedUser) throw new ApiError(400, "User not found");
  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "CoverImage updated Successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword,
  updateAccountDetails,
  updateUserAvtar,
  updateUserCoverImage,
};

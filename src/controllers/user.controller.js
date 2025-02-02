import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import {uploadOnCloudinary,deleteCloudinaryImage} from "../utils/cloudinary.js"
// import {upload} from "../middlewares/multer.middleware.js"
// import mongoose from "mongoose";


const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const registerUser = asyncHandler(async(req, res) => {

    // Email regex pattern
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    // Password regex (At least 8 characters, At most 12 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,12}$/;

    const {fullName, email, contact, password, role = "user"} = req.body
    // console.log("email: ", email);

    // Check if all required fields are provided
    if (!contact || !email || !fullName || !password) {
        throw new ApiError(400, "All fields are required");
    }

    if (
        [fullName, email, contact, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields must be not empty");
    }

    // Validate email format
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate password strength
    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            message:
                "Password must be at least 8 and atmost 12 characters long and include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.",
        });
    }

    const existedUser = await User.findOne({
        $or: [{ contact }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or contact already exists");
    }
    
    const user = await User.create({
        fullName,
        email:email.toLowerCase(), 
        password,
        contact,
        avatar:"",
        role: role || "user", // Default role is 'user'
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    );


})

const loginUser = asyncHandler(async (req, res) =>{

    const {email, contact, password} = req.body
    // console.log(email);

    if (!password && !email) {
        throw new ApiError(400, "password and email is required")
    }
    
    const user = await User.findOne({
        $or: [{contact}, {email}]
    })

    if (!user) {
        throw new ApiError(400, "User does not exist")
    }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
    }

   const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken -createdAt -updatedAt")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const uploadAvatar = asyncHandler(async (req, res) => {
    try {
        // Get the user from the JWT token (assuming `req.user` contains user ID)
        const userId = req.user.id;

        // Validate user existence
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Validate file
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const localFilePath = req.file.path; // Get the temp file path

        // If the user already has an avatar, delete the old one before uploading a new one
        if (user.avatar) {
            // Extract public ID from Cloudinary URL
            const publicId = user.avatar.split("/").pop().split(".")[0]; 
            console.log("Public ID extracted:", publicId);

            // Delete the existing image from Cloudinary
            await deleteCloudinaryImage(publicId);
        }

        // Upload new avatar to Cloudinary (store in trip-planner/profile/)
        const uploadResult = await uploadOnCloudinary(localFilePath, "Profile");

        if (!uploadResult) {
            return res.status(500).json({ error: "Image upload failed" });
        }

        // Update user avatar field with the new Cloudinary URL
        user.avatar = uploadResult.secure_url;
        await user.save();

        return res.json({
            message: "Avatar updated successfully",
            avatarUrl: uploadResult.secure_url
        });

    } catch (error) {
        console.error("Error uploading avatar:", error);
        res.status(500).json({ error: "Server error" });
    }
});







export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    uploadAvatar
}
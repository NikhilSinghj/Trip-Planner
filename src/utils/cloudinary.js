import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import dotenv from "dotenv";
dotenv.config();


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});


// Function to upload an image from Cloudinary
const uploadOnCloudinary = async (localFilePath, folderName) => {
    try {
        if (!localFilePath || !folderName) return null;

        const cloudinaryFolder = `Trip-Planner/${folderName}`;

        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            folder: cloudinaryFolder,
            resource_type: "auto"
        });
        // file has been uploaded successfull
        console.log("File is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

// Function to delete an image from Cloudinary
const deleteCloudinaryImage = async (publicId) => {
    try {
        // Delete the image from Cloudinary
        const result = await cloudinary.uploader.destroy(`Trip-Planner/Profile/${publicId}`);
        return result;
    } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
        throw new Error("Image deletion failed");
    }
};



export {uploadOnCloudinary,
    deleteCloudinaryImage,
}
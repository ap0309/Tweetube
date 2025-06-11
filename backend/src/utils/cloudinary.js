import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import { ApiError } from "./ApiError.js";


 // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

const uploadOnCloudinary = async (localFilePath) =>{
    try {
        if(!localFilePath) {
            return null;
        }
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type : "auto"
        })
       // console.log("File is uploaded " , response.url );
        //console.log("cloudinary response : " , response);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return response;
    }catch(error){
        throw new ApiError(502,"Error in uploading!")
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        } // case 1 where not uploaded but we got file locally so remove it
        return null;
    }
}

export {uploadOnCloudinary};
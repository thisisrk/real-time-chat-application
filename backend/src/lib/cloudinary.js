// lib/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary with timeout and optimization settings
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  timeout: 60000, // 60 seconds timeout
});

// Helper function to upload images with optimized settings
export const uploadImage = async (imageString) => {
  try {
    const result = await cloudinary.uploader.upload(imageString, {
      timeout: 60000,
      resource_type: "auto",
      quality: "auto:good", // Optimize quality
      fetch_format: "auto", // Auto-select best format
      flags: "attachment", // Treat as attachment
      transformation: [
        { width: 500, crop: "limit" }, // Limit max width
        { quality: "auto:good" } // Optimize quality
      ]
    });
    return result;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

export default cloudinary;

import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";

import cloudinary from "../config/cloudinaryConfig.js";

// Define storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "mentor_ai_profiles", // Folder name in Cloudinary
    allowed_formats: ["jpg", "png", "jpeg"],
    transformation: [{ width: 500, height: 500, crop: "limit" }],
  },
});

const upload = multer({ storage });

export default upload;

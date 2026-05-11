import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

function fileFilter(_, file, cb) {
  const allowed = /jpeg|jpg|svg|png|gif/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) cb(null, true);
  else cb(new Error("Only image files (jpg, png, gif) are allowed."));
}

const maxSize = parseInt(process.env.MAX_FILE_SIZE_BYTES || "2000000", 10);

export const upload = multer({
  storage,
  limits: { fileSize: maxSize },
  fileFilter,
});

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey"; // add this in your .env file

// 🔐 Hash password
export const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainPassword, salt);
};

// ✅ Compare passwords (use later for login)
export const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

// 🎟️ Generate JWT
export const generateToken = (userId, role = "admin") => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, {
    expiresIn: "7d",
  });
};
// 🔍 Verify JW T
export const verifyToken = (token) => {
  try {
   const decoded = jwt.verify(token, JWT_SECRET);
   if (!decoded) {
    throw new Error("Invalid token");
   }
   console.log("decodedToken", decoded);
  //  if(decoded.role === "admin"){
  //   return decoded;
  //  }else{
  //   throw new Error("Invalid token");
  //  }
    return decoded;
   
    } catch (error) {
    throw new Error("Invalid token: " + error.message);
    }
};

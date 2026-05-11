// backend/services/adminService.js
import Admin from "../models/Admin.js";
import { hashPassword } from "../utils/authUtils.js";

export const registerAdmin = async (data) => {
  try {
    const bcryptPassword =await  hashPassword(data.password) // In real implementation, hash the password
    const adminObj = {
      email: data.email,
      name: data.name,
      password: bcryptPassword, // later you'll hash this!
    };

    const admin = new Admin(adminObj);
    const savedAdmin = await admin.save();

    return savedAdmin;
  } catch (error) {
    throw new Error("Error registering admin: " + error.message);
    return null;
  }
};

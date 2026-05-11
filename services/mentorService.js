import User from "../models/User.js";
import { hashPassword } from "../utils/authUtils.js";

export const createMentor = async (data) => {
    const hashedPassword = await hashPassword(data.password);
  const userObj = {
    email: data.email,
    name: data.name,
    password: hashedPassword,
    profession: data.profession,
    experience: data.experience,
    skillLevel: data.skillLevel,
    githubUrl: data.githubUrl || "",
    linkedinUrl: data.linkedinUrl || "",
    role: "mentor",
    status: "active",
    approved: false,
    profilePicture: {
      url: null,
      filename: null
    }
  };

  const user = new User(userObj);
  return await user.save();
};

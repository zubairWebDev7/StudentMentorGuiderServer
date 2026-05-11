import Joi from "joi";

export const createMentorSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).max(100).required(),
  profession: Joi.string().min(2).max(100).required(),
  experience: Joi.number().min(0).max(100).required(),
  skillLevel: Joi.string()
    .valid("beginner", "intermediate", "advanced", "expert")
    .required(),
  githubUrl: Joi.string().uri().allow("", null),
  linkedinUrl: Joi.string().uri().allow("", null),
});


export const adminSignupSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).required(),
  password: Joi.string().min(6).required(),
});
// const studentSchema = new mongoose.Schema({
//   fullName: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
//   educationLevel: { type: String, required: true },
//   careerGoals: { type: String, required: true },
//   interests: [{ type: String, required: true }],
//   timezone: { type: String, required: true },
//   languagePreference: { type: String, required: true },
//   budgetRange: { type: String },
//   profilePicture: {
//     url: { type: String, default: null },
//     filename: { type: String, default: null },
//   },
//   role: { type: String, default: "student" },
//   status: { type: String, default: "active" },
//   verified: { type: Boolean, default: false },
// }, { timestamps: true });

export const studentSignupSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  
  educationLevel: Joi.string().min(2).max(100).required(),
  careerGoals: Joi.string().min(2).max(500).required(),
  interests: Joi.array().items(Joi.string().min(2).max(100)).required(),
  
  languagePreference: Joi.string().min(2).max(100).required(),
 
  
});
export const studentLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});
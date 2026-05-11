import mongoose from "mongoose";
// {
//   "name": "Zubair Ahmed",
//   "email": "zubair.student@example.com",
//   "password": "StrongPass123!",
//   "educationLevel": "Undergraduate",
//   "careerGoals": "I want to become a full-stack web developer specializing in AI-integrated apps.",
//   "interests": ["JavaScript", "React", "Node.js", "Machine Learning"],
//   "languagePreference": "English"
// } create the schema to match this data
const studentSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    educationLevel: { type: String, required: true, trim: true },
    careerGoals: { type: String, required: true, trim: true },
    interests: { type: [String], required: true },
    languagePreference: { type: String, required: true, trim: true },
    fieldOfStudy: { type: String, default: null, trim: true },
    academicLevel: { type: String, default: null, trim: true },
    profilePicture: {
        url: { type: String, default: null },
        filename: { type: String, default: null },
    },
});
const Student = mongoose.model("Student", studentSchema);
export default Student;
    

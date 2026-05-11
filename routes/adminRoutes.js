import express from "express";
import { adminLogin, adminSignup, approvedMentorswithRag, deleteMentor, getAllCourses, updateCourseStatus } from "../controllers/adminController.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { adminSignupSchema } from "../validations/adminValidation.js";
import { adminLoginSchema } from "../validations/adminValidation.js";
import { adminVerification } from "../middlewares/adminVerification.js";
import { approvedMentors, getAllMentors } from "../controllers/adminController.js";

const adminRouter = express.Router();

adminRouter.post("/signup", validateRequest(adminSignupSchema), adminSignup);
adminRouter.post("/login",validateRequest(adminLoginSchema), adminLogin);
adminRouter.post("/logout", (req, res) => {
    
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    });

  
  res.json({ message: "Admin logged out successfully" });
})  
adminRouter.get("/mentors",adminVerification, getAllMentors);
// adminRoutes.js
adminRouter.put("/mentors/:mentorId", adminVerification, approvedMentorswithRag);
// get all courses that enrolled by User
adminRouter.get("/courses", adminVerification, getAllCourses);
// update the status of course pending to active 

adminRouter.put("/courses/:courseId/", adminVerification,updateCourseStatus);
adminRouter.delete("/mentors/:mentorId", adminVerification, deleteMentor);

export default adminRouter;
                                  
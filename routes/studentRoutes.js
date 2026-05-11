import express from "express";
import { getChats, getMentors, getStudentProfile, loginStudent, recentChats, signupStudent, SuggestFromAi, getCourses } from "../controllers/studentController.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { studentLoginSchema, studentSignupSchema } from "../utils/validators.js";
import { studentVerification } from "../middlewares/studentVerification.js";
// import { signup } from "../controllers/studentController";
const studentRouter = express.Router();


// signup student 
studentRouter.post("/signup",validateRequest(studentSignupSchema), signupStudent);
studentRouter.post("/login",validateRequest(studentLoginSchema),  loginStudent);
studentRouter.get("/profile", studentVerification, getStudentProfile );
studentRouter.get('/all-mentor',studentVerification, getMentors )
studentRouter.get('/courses', studentVerification, getCourses)
studentRouter.post("/AISuggestion",studentVerification, SuggestFromAi )
studentRouter.get("/previouseChat/:mentorId",studentVerification, getChats  )
// get the student chat to mentor only getChats of that mentor that have student messaegs 
studentRouter.get("/studentchat",studentVerification, recentChats)
// routes for the ask From AI Ai suggest the verified mentor to the student based on the student learning profile and the mentor expertise and availability and timezone compatibility and the student can also ask for specific mentor based on the mentor name or expertise and the AI will suggest the best match for the student based on the student learning profile and the mentor expertise and availability and timezone compatibilityalso take input prompt from the user 
studentRouter.post("/AISuggestion", studentVerification, SuggestFromAi)





export default studentRouter;
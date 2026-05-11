import express from "express";
import { validateRequest } from "../middlewares/validateRequest.js";
import { createMentorSchema } from "../utils/validators.js";
import { createCourse, createMentor, deleteCourse, deleteProfilePicture, getChatsAsMentor, getChatsAsMentor1, getMentorProfile, getPreviousChat, getPreviousChatList, loginMentor, uploadPicture, getMyCourses, uploadCourseThumbnail, deleteCourseThumbnail } from "../controllers/mentorController.js";
import { mentorVerification } from "../middlewares/mentorVerification.js";
import upload from "../middlewares/uploadImage.js";

const router = express.Router();

router.post("/signup", validateRequest(createMentorSchema), createMentor);
router.post("/login", loginMentor)
router.get("/profile", mentorVerification, getMentorProfile);
router.post("/uploadProfile", mentorVerification, upload.single("image"),
    uploadPicture)
router.delete("/deleteProfilePicture", mentorVerification, deleteProfilePicture)

router.get("/previouseChat/list", mentorVerification, getChatsAsMentor);
router.get("/stdPreviouseChat/:studentId", mentorVerification, getChatsAsMentor1)
// create the courses 
router.post("/create", mentorVerification, upload.single("thumbnail"), createCourse)
router.delete("/deleteCourse/:courseId", mentorVerification, deleteCourse)
router.get("/courses", mentorVerification, getMyCourses)
// thumbnail upload/delete for courses (separate endpoints if needed)
router.post("/courses/:courseId/thumbnail", mentorVerification, upload.single("thumbnail"), uploadCourseThumbnail)
router.delete("/courses/:courseId/thumbnail", mentorVerification, deleteCourseThumbnail)

export default router;

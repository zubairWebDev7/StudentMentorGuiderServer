import upload from "../middlewares/uploadImage.js";
import User from "../models/User.js";
import { createMentor as createMentorService } from "../services/mentorService.js";
import { comparePassword, generateToken } from "../utils/authUtils.js";
import cloudinary from "../config/cloudinaryConfig.js";
// import Message from "../models/messageModel.js"
import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import Student from "../models/Student.js";
import Course from "../models/course.js";
// import User from "../models/User.js";

export const createMentor = async (req, res, next) => {
  try {
    const savedUser = await createMentorService(req.body);

    return res.status(201).json({
      message: "Mentor created successfully",
      user: savedUser,
    });
  } catch (err) {
    next(err);
  }

};
export const loginMentor = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log("email,paswweord", email, password);

    // check the mentor exist in mentor Collection  
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    // also get the password and compare later
    const mentor = await User.findOne({ email: email, role: "mentor" });
    console.log("mentor in db ", mentor);

    if (!mentor) {
      return res.status(401).json({ message: "Invalid email" });
    }
    if (await comparePassword(password, mentor.password) === false) {
      return res.status(401).json({ message: "Invalid password" });
    }
    const token = generateToken(mentor._id, "mentor");
    // auto set the response to cookies
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // Set to false in development (localhost)
      sameSite: 'lax', // Change from 'strict' to 'lax'
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'

    });
    return res.status(200).json({
      message: "Mentor login successful",
      role: "mentor",
      mentor,
      accessToken: token
    });
  } catch (err) {
    next(err);
  }
};
export const getMentorProfile = async (req, res, next) => {
  try {
    const mentorId = req.user.id;
    const mentor = await User.findById(mentorId).select("-password");
    if (!mentor) {
      return res.status(404).json({ message: "Mentor not found" });
    }
    res.status(200).json({
      mentor,
      message: "Mentor profile fetched successfully"
    });
  } catch (err) {
    next(err);
  }
};


export const uploadPicture = async (req, res, next) => {
  try {
    const mentorId = req.user.id;

    // Check if file exists (multer adds it to req.file)
    if (!req.file) {
      return res.status(400).json({ message: "No image file uploaded" });
    }

    // Get Cloudinary file info
    const imageUrl = req.file.path;
    const filename = req.file.filename;

    // Update mentor record in DB
    const updatedMentor = await User.findByIdAndUpdate(
      mentorId,
      {
        $set: {
          "profilePicture.url": imageUrl,
          "profilePicture.filename": filename,
        },
      },
      { new: true }
    );

    if (!updatedMentor) {
      return res.status(404).json({ message: "Mentor not found" });
    }

    return res.status(200).json({
      message: "Profile picture uploaded successfully",
      profilePicture: updatedMentor.profilePicture,
    });
  } catch (error) {
    next(error);
  }
};



export const deleteProfilePicture = async (req, res, next) => {
  try {
    const mentorId = req.user.id;

    const mentor = await User.findById(mentorId);
    if (!mentor) {
      return res.status(404).json({ message: "Mentor not found" });
    }

    // Check if mentor has an existing profile picture
    if (!mentor.profilePicture || !mentor.profilePicture.filename) {
      return res.status(400).json({ message: "No profile picture to delete" });
    }

    // Delete from Cloudinary
    const publicId = mentor.profilePicture.filename;
    await cloudinary.uploader.destroy(publicId);

    // Remove from DB
    mentor.profilePicture = { url: null, filename: null };
    await mentor.save();

    return res.status(200).json({ message: "Profile picture deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getChatsAsMentor1 = async (req, res) => {
  try {
    const mentorId = req.user.id; // ✅ from token
    const { studentId } = req.params; // ✅ from URL

    if (!mentorId || !studentId) {
      return res.status(400).json({ message: "Mentor ID or Student ID missing" });
    }

    // ✅ Find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [mentorId, studentId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [mentorId, studentId],
      });
    }

    // ✅ Fetch messages
    const messages = await Message.find({
      conversationId: conversation._id,
    }).sort({ createdAt: 1 });

    // ✅ Fetch student info (include profilePicture so the UI can render the avatar)
    const student = await Student.findById(studentId).select("name profilePicture");
    console.log("the student info ", studentId, student);

    // ✅ Format messages
    const formattedMessages = messages.map((msg) => ({
      _id: msg._id,
      text: msg.text,
      senderId: msg.senderId,
      senderType:
        msg.senderId.toString() === mentorId.toString()
          ? "mentor"
          : "student",
      createdAt: msg.createdAt,
    }));

    return res.status(200).json({
      student: {
        name: student?.name || "Unknown Student",
        // Frontend (mentor chat page) expects an object with a `url` field
        profilePicture: student?.profilePicture?.url
          ? { url: student.profilePicture.url }
          : null,
      },
      messages: formattedMessages,
    });
  } catch (error) {
    console.error("❌ Error fetching chat (mentor):", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getChatsAsMentor = async (req, res, next) => {
  try {
    const mentorId = req.user.id;
    const studentId = req.params.studentId;   

    // ✅ Get all messages where this mentor is involved
    const messages = await Message.find({
      $or: [{ senderId: mentorId }, { receiverId: mentorId }],
    }).populate("senderId receiverId", "name email role profilePicture");
    console.log("the id mesages", messages);



    // ✅ Extract unique student IDs safely
    const studentMap = new Map();

    messages.forEach((msg) => {
      const sender = msg.senderId;
      const receiver = msg.receiverId;
      console.log("the senderId", msg);
      // console.log("the receiverId", msg);
      
      

      // 🧩 check both sides safely
      if (sender ) {
        studentMap.set(sender._id.toString(), sender);
      }
      if (receiver ) {
        studentMap.set(receiver._id.toString(), receiver);
      }
    });
    console.log("student messages ", studentMap);
    

    const uniqueStudents = Array.from(studentMap.values());

    return res.status(200).json({
      message: "Fetched students who have chatted with mentor",
      students: uniqueStudents,
    });
  } catch (err) {
    console.error("❌ Error in getChatsAsMentor:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
export const getPreviousChatList = async (req, res) => {
  try {
    const mentorId = req.user.id;
    console.log("the mentorId is that msg student ",mentorId);
    

    // Find conversations where mentor is a participant
    const conversations = await Conversation.find({ participants: mentorId }).lean();

    if (!conversations || conversations.length === 0) {
      return res.status(200).json({ students: [] });
    }

    // Extract unique student IDs
    const studentIds = conversations
      .flatMap(conv => conv.participants)
      .filter(id => id.toString() !== mentorId.toString());

    // Fetch student details
    const students = await User.find({ _id: { $in: studentIds }, role: "student" })
      .select("name email profilePicture");

    res.status(200).json({ students });
  } catch (error) {
    console.error("❌ Error fetching previous chat list:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🔹 Get chat messages between mentor and student
export const getPreviousChat = async (req, res) => {
  try {
    const { studentId } = req.params;
    const mentorId = req.user.id;

    let conversation = await Conversation.findOne({
      participants: { $all: [mentorId, studentId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [mentorId, studentId],
      });
    }

    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .lean();

    const student = await User.findById(studentId).select("name");

    res.status(200).json({
      student: {
        name: student?.name || "Unknown Student",
        profilePicture: student?.profilePicture || null,
      },
      messages,
    });
  } catch (error) {
    console.error("❌ Error fetching chat:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
export const createCourse = async (req, res) => {
  try {
    const mentorId = req.user.id;

    // ensure the user exists and is a mentor
    const mentor = await User.findById(mentorId);
    if (!mentor || mentor.role !== "mentor") {
      return res.status(403).json({ message: "Only mentors can create courses" });
    }

    // Accept input from JSON body or multipart/form-data (strings)
    const {
      title,
      subtitle,
      description,
      price,
      durationHours,
      syllabus,
      tags,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    // Normalize possible stringified arrays (if sent from a form)
    const parsedSyllabus =
      typeof syllabus === "string" && syllabus.length
        ? JSON.parse(syllabus)
        : Array.isArray(syllabus)
        ? syllabus
        : [];

    const parsedTags =
      typeof tags === "string" && tags.length
        ? JSON.parse(tags)
        : Array.isArray(tags)
        ? tags
        : [];

    // Build course data
    const courseData = {
      title: title.trim(),
      subtitle: subtitle ? subtitle.trim() : null,
      description,
      mentor: mentorId,
      price: price ? Number(price) : 0,
      durationHours: durationHours ? Number(durationHours) : 0,
      syllabus: parsedSyllabus,
      tags: parsedTags,
      // always create courses as pending for admin approval
      status: "pending",
    };

    // If thumbnail file is uploaded, add its metadata
    if (req.file) {
      courseData.thumbnail = {
        url: req.file.path,
        filename: req.file.filename,
      };
    }

    const createdCourse = await Course.create(courseData);

    return res.status(201).json({ message: "Course created successfully", course: createdCourse });
  } catch (error) {
    console.error("❌ Error creating course:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
export const deleteCourse = async (req, res) => {
  try {    const mentorId = req.user.id;
    const { courseId } = req.params;
    // delete the course only if it belongs to the mentor
    const course = await Course.findOneAndDelete({ _id: courseId, mentor: mentorId });
    if (!course) {
      return res.status(404).json({ message: "Course not found or you don't have permission to delete it" });
    }
    return res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting course:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getMyCourses = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const courses = await Course.find({ mentor: mentorId }).sort({ createdAt: -1 });
    return res.status(200).json({ courses });
  } catch (error) {
    console.error("❌ Error fetching mentor courses:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const uploadCourseThumbnail = async (req, res, next) => {
  try {
    const mentorId = req.user.id;
    const { courseId } = req.params;

    // Check if file exists (multer adds it to req.file)
    if (!req.file) {
      return res.status(400).json({ message: "No image file uploaded" });
    }

    // Get Cloudinary file info
    const imageUrl = req.file.path;
    const filename = req.file.filename;

    // Update course thumbnail only if it belongs to the mentor
    const updatedCourse = await Course.findOneAndUpdate(
      { _id: courseId, mentor: mentorId },
      {
        $set: {
          "thumbnail.url": imageUrl,
          "thumbnail.filename": filename,
        },
      },
      { new: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ message: "Course not found or you don't have permission to update it" });
    }

    return res.status(200).json({
      message: "Course thumbnail uploaded successfully",
      thumbnail: updatedCourse.thumbnail,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCourseThumbnail = async (req, res, next) => {
  try {
    const mentorId = req.user.id;
    const { courseId } = req.params;

    const course = await Course.findOne({ _id: courseId, mentor: mentorId });
    if (!course) {
      return res.status(404).json({ message: "Course not found or you don't have permission to delete its thumbnail" });
    }

    // Check if course has an existing thumbnail
    if (!course.thumbnail || !course.thumbnail.filename) {
      return res.status(400).json({ message: "No thumbnail to delete" });
    }

    // Delete from Cloudinary
    const publicId = course.thumbnail.filename;
    await cloudinary.uploader.destroy(publicId);

    // Remove from DB
    course.thumbnail = { url: null, filename: null };
    await course.save();

    return res.status(200).json({ message: "Course thumbnail deleted successfully" });
  } catch (error) {
    next(error);
  }
};
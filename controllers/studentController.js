import Student from "../models/Student.js";
import User from "../models/User.js";
import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import Course from "../models/course.js";
import { comparePassword, generateToken, hashPassword } from "../utils/authUtils.js";
import { ChatOpenAI } from "@langchain/openai";
import { createEmbedding } from "../utils/embeding.js";
import { findSimilarMentors } from "../utils/vectorStore.js";
import { generateWithGemini } from "../utils/llm.js";

export const signupStudent = async (req, res) => {
  const { name, email, password, educationLevel, careerGoals, interests, languagePreference } = req.body;
  const hashedPassword = await hashPassword(password);
  const newStudent = {
    name,
    email,
    password: hashedPassword,
    educationLevel,
    careerGoals,
    interests,
    languagePreference,
  };
  console.log("New Student Signup:", newStudent);
  const studentCreated = await Student.create(newStudent);
  res.status(201).json({
    message: "Student signed up successfully",
    student: studentCreated,
  });
};

export const loginStudent = async (req, res) => {
  const { email, password } = req.body;
  const studentInDb = await Student.findOne({ email: email });
  if (!studentInDb) {
    return res.status(401).json({ message: "Invalid email" });
  }
  if (comparePassword(password, studentInDb.password) === false) {
    return res.status(401).json({ message: "Invalid password" });
  }
  const token = generateToken(studentInDb._id, "student");

 const isProduction = process.env.NODE_ENV === "production";

res.cookie("token", token, {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
});
  return res.status(200).json({
    message: "Student login successful",
    accessToken: token,
    role: "student",
  });
};

export const getStudentProfile = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await Student.findById(studentId).select("-password");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.status(200).json({
      student,
      message: "Student profile fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching student profile:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const viewMentorProfile = async (req, res) => {
  try {
    const { mentorId } = req.params;
    const mentor = await User.findOne({ _id: mentorId, role: "mentor", approved: true }).select("-password");
    if (!mentor) {
      return res.status(404).json({ message: "Mentor not found or not approved" });
    }
    res.status(200).json({
      mentor,
      message: "Mentor profile fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching mentor profile:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getMentors = async (req, res) => {
  try {
    const mentors = await User.find({ role: "mentor", approved: true, status: "active" }).select("-password");
    res.json({ mentors });
  } catch (err) {
    console.error("Error fetching mentors:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};



export const SuggestFromAi = async (req, res) => {
  try {
    const { prompt } = req.body;
    const studentId = req.user.id;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    const studentInDb = await Student.findById(studentId);
    if (!studentInDb) {
      return res.status(401).json({ message: "Invalid student" });
    }

    const studentInterests = Array.isArray(studentInDb.interests)
      ? studentInDb.interests.join(", ")
      : studentInDb.interests || "";

    // 🔑 Use the PROMPT as the primary search signal.
    // The prompt reflects what the student wants to learn *now*,
    // not what they already know.
    const searchQuery = prompt.trim();

    // 1️⃣ Vector search driven by the prompt only
    const topMentors = await findSimilarMentors(searchQuery, 5);

    // 2️⃣ Apply a relevance threshold — if nothing is genuinely close,
    // don't pretend otherwise.
    const RELEVANCE_THRESHOLD = 0.35; // tune between 0.30 - 0.45
    const relevantMentors = topMentors.filter(
      (m) => m.similarity >= RELEVANCE_THRESHOLD
    );

    // Case A: No relevant mentors at all
    if (relevantMentors.length === 0) {
      return res.status(200).json({
        aiSuggestion: `I couldn't find a mentor who specializes in "${prompt}" right now. Our current mentors focus on different areas. You can browse all mentors on the Mentors page, or check back soon as new mentors join regularly.`,
        recommendedMentors: [],
        totalFound: 0,
        noDirectMatch: true,
      });
    }

    // 3️⃣ Build LLM context — profile is shown here so the LLM can
    // personalize the *narration*, but it didn't bias the search.
   
     const studentContext = `
Student Profile:
- Name: ${studentInDb.name || "N/A"}
- Education Level: ${studentInDb.educationLevel || "N/A"}
- Career Goals: ${studentInDb.careerGoals || "N/A"}
- Existing Interests: ${studentInterests || "N/A"}
    `.trim();

    const mentorContext = relevantMentors
      .map(
        (m, i) => `Mentor ${i + 1}:
- Name: ${m.name}
- Profession: ${m.profession}
- Experience: ${m.experience} years
- Skill Level: ${m.skillLevel}
- Relevance to request: ${(m.similarity * 100).toFixed(1)}%`
      )
      .join("\n\n");

    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.5,
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 🔑 Strict prompt — the LLM must NOT oversell weak matches.
    const aiPrompt = `
You are a straightforward academic advisor helping a student find a mentor.

${studentContext}

Student's Current Request:
"${prompt}"

Candidate Mentors (ranked by semantic relevance to the request):
${mentorContext}

Write a concise, honest response (120-200 words) that:
1. Directly addresses what the student asked for ("${prompt}").
2. For each mentor you recommend, state HONESTLY whether their profession directly matches the request, or whether they are only adjacent/tangentially related.
3. If a mentor's profession does NOT clearly match the request, say so plainly — e.g. "Zubiii is a web developer, not a DevOps specialist, but could help you with the development side that connects to DevOps workflows." Do NOT pretend a beginner web developer is a good DevOps mentor.
4. If none of the mentors are a strong direct match, say that clearly and suggest the student revisit later or browse other mentors.
5. Do NOT invent skills, certifications, or expertise not listed above.
6. Skip mentors with Skill Level "beginner" unless their profession is an exact match for the request.

Tone: friendly but honest. No markdown headers. No hype.
    `.trim();
    const response = await generateWithGemini(aiPrompt);

    // const response = await llm.invoke(aiPrompt);
console.log("LLM Response:", response);
    return res.status(200).json({
      aiSuggestion: response  ,
      recommendedMentors: relevantMentors,
      totalFound: relevantMentors.length,
    });
  } catch (error) {
    console.error("❌ Error in SuggestFromAi:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getChats = async (req, res) => {
  try {
    const { mentorId } = req.params;
    const studentId = req.user.id;

    if (!mentorId || !studentId) {
      return res.status(400).json({ message: "Mentor ID or Student ID missing" });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [mentorId, studentId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [studentId, mentorId],
      });
    }

    const messages = await Message.find({ conversationId: conversation._id });

    const mentor = await User.findById(mentorId).select("name profilePicture");

    const formattedMessages = messages.map((msg) => ({
      _id: msg._id,
      text: msg.text,
      senderId: msg.senderId,
      senderType: msg.senderId.toString() === studentId.toString() ? "student" : "mentor",
      createdAt: msg.createdAt,
    }));

    return res.status(200).json({
      mentor: {
        name: mentor?.name || "Unknown Mentor",
        profilePicture: mentor?.profilePicture?.url || null,
      },
      messages: formattedMessages,
    });
  } catch (error) {
    console.error("❌ Error fetching chat:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const recentChats = async (req, res) => {
  try {
    const studentId = req.user.id;

    if (!studentId) {
      return res.status(400).json({ message: "Student ID missing" });
    }

    const conversations = await Conversation.find({
      participants: studentId,
    });

    const mentorMap = new Map();

    for (const convo of conversations) {
      const mentorId = convo.participants.find(
        (id) => id.toString() !== studentId.toString()
      );

      if (!mentorId) continue;

      const message = await Message.findOne({ conversationId: convo._id })
        .sort({ createdAt: -1 })
        .lean();

      if (!message) continue;

      const existing = mentorMap.get(mentorId.toString());

      if (
        !existing ||
        new Date(message.createdAt) > new Date(existing.latestMessage.createdAt)
      ) {
        mentorMap.set(mentorId.toString(), {
          mentorId,
          latestMessage: message,
        });
      }
    }

    const mentorIds = [...mentorMap.keys()];
    const mentors = await User.find({ _id: { $in: mentorIds } })
      .select("name profilePicture")
      .lean();

    const mentorInfoMap = new Map(mentors.map((m) => [m._id.toString(), m]));

    const chats = [...mentorMap.entries()]
      .map(([mentorId, data]) => {
        const mentor = mentorInfoMap.get(mentorId);
        return {
          mentor: {
            id: mentorId,
            name: mentor?.name || "Unknown Mentor",
            profilePicture: mentor?.profilePicture?.url || null,
          },
          latestMessage: {
            _id: data.latestMessage._id,
            text: data.latestMessage.text,
            senderId: data.latestMessage.senderId,
            senderType:
              data.latestMessage.senderId.toString() === studentId.toString()
                ? "student"
                : "mentor",
            createdAt: data.latestMessage.createdAt,
          },
        };
      })
      .sort(
        (a, b) =>
          new Date(b.latestMessage.createdAt) -
          new Date(a.latestMessage.createdAt)
      );

    return res.status(200).json({ chats });
  } catch (error) {
    console.error("❌ Error fetching recent chats:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find({ status: "active" }).populate("mentor", "name email");
    res.json({ courses });
  } catch (err) {
    console.error("Error fetching courses:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
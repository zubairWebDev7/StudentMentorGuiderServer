import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";

import Conversation from "./models/conversationModel.js";
import Message from "./models/messageModel.js";

// import chatRoutes from "./routes/chatRoutes.js";
import mentorRoutes from "./routes/mentorRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import studentRouter from "./routes/studentRoutes.js";
import { index } from "./config/pinecone.js";
import { createEmbedding } from "./utils/embeding.js";

dotenv.config();

// -------------------- APP SETUP --------------------
const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(express.json());
// At the top of your Express app (before routes)
// const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3006', // Your Next.js URL
  credentials: true, // CRITICAL: Allows cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet());
app.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));
app.use(cookieParser());

// Routes
app.use("/user/mentor", mentorRoutes);
app.use("/admin", adminRouter);
app.use("/user/student", studentRouter);
// app.use("/chat", chatRoutes);

// -------------------- SOCKET.IO SETUP --------------------
// -------------------- SOCKET.IO SETUP --------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3006", // your frontend URL
    credentials: true,                // ✅ required for cookies
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});


const onlineUsers = new Map();
console.log("Socket.io server initialized and the online user map is set up.", onlineUsers);

io.on("connection", (socket) => {
  console.log("🟢 New user connected:", socket.id);

  // user joins with their id
  socket.on("join", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`✅ User joined: ${userId}`);
  });

  // start conversation between student and mentor
  socket.on("start_conversation", async ({ senderId, receiverId }) => {
    try {
      let conversation = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] },
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [senderId, receiverId],
        });
      }

      socket.emit("conversation_started", conversation);
    } catch (error) {
      console.error("❌ Error starting conversation:", error.message);
      socket.emit("error_message", "Failed to start conversation");
    }
  });

  // send message event
  socket.on("send_message", async ({ senderId, receiverId, text, senderRole }) => {
    try {
      // Validate all required fields
      if (!senderId || !receiverId || !text || !senderRole) {
        return socket.emit("error_message", "Missing required fields");
      }

      console.log("💬  messagSendinge:", senderId, "→", receiverId, ":", text);
 
      // 1️⃣ Find or create conversation
      let conversation = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] },
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [senderId, receiverId],
        });
      }

      // 2️⃣ Determine dynamic models
      const senderModel = senderRole === "mentor" ? "User" : "Student";
      const receiverModel = senderRole === "mentor" ? "Student" : "User";

      // 3️⃣ Create and save the message
      const message = await Message.create({
        conversationId: conversation._id,
        senderId,
        senderModel,
        receiverId,
        receiverModel,
        text,
      });

      // 4️⃣ Update conversation
      conversation.lastMessage = text;
      conversation.updatedAt = new Date();
      await conversation.save();

      // 5️⃣ Prepare message payload with senderRole for frontend filtering
      const messagePayload = {
        ...message.toObject(),
        senderRole,
      };
     

      // // 6️⃣ Emit to receiver if rather than broadcasting send to that receiver that user only
      console.log("Socket.io server initialized and the online user map is set up.", onlineUsers);
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        console.log(" the receiver id", receiverSocketId);
        
        io.to(receiverSocketId).emit("receive_message", messagePayload);
      }

      // 7️⃣ Emit back to sender for acknowledgment
      socket.emit("message_sent", messagePayload);

    } catch (error) {
      console.error("❌ Error sending message:", error.message);
      socket.emit("error_message", "Failed to send message");
    }
  });



  // handle disconnect
  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
      }
    }
  });
});

// -------------------- DATABASE + SERVER START --------------------

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.error("❌ MongoDB Connection Error: with uri",process.env.MONGODB_URI, err));

  // try {
  //   const response = await createEmbedding("Hello, world!");
  // console.log("Embedding created successfully:", response);
  // } catch (error) {
  //   console.error("Error creating embedding:", error);
  // }
  

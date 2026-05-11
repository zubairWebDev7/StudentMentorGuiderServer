import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Conversation", 
      required: true 
    },
    senderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true, 
      refPath: "senderModel"   // dynamically references User or Student
    },
    senderModel: { 
      type: String, 
      required: true, 
      enum: ["User", "Student"] 
    },
    receiverId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true, 
      refPath: "receiverModel" // dynamically references User or Student
    },
    receiverModel: { 
      type: String, 
      required: true, 
      enum: ["User", "Student"] 
    },
    text: { 
      type: String, 
      required: true 
    },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);

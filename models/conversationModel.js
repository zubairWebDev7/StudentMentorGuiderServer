import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  participants: [
    { type: mongoose.Schema.Types.ObjectId, required: true }
  ],
}, { timestamps: true });

export default mongoose.model("Conversation", conversationSchema);

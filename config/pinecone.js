import { Pinecone } from "@pinecone-database/pinecone";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

export const index = pinecone.index("test2", "https://test2-684kulx.svc.aped-4627-b74a.pinecone.io");

// optional debug log
console.log("✅ Pinecone initialized");
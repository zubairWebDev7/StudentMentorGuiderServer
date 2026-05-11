import { createEmbedding } from "./embeding.js";
import User from "../models/User.js";

// Cosine similarity between two equal-length vectors
function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB)) return 0;
  if (vecA.length !== vecB.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find top-K mentors most similar to the query text.
 * Returns mentor objects with a `similarity` score attached,
 * sorted by similarity descending. Embedding field is stripped
 * before returning so the response stays lean.
 */
export const findSimilarMentors = async (queryText, topK = 5) => {
  if (!queryText || !queryText.trim()) {
    throw new Error("Query text is required");
  }

  const queryEmbedding = await createEmbedding(queryText);
  if (!queryEmbedding || queryEmbedding.length === 0) {
    throw new Error("Invalid query embedding");
  }

  // Fetch only approved, active mentors that have an embedding
  const mentors = await User.find({
    role: "mentor",
    approved: true,
    status: "active",
    embedding: { $exists: true, $ne: [] },
  }).select("name profession experience skillLevel profilePicture embedding");

  if (mentors.length === 0) return [];

  // Score each mentor
  const scored = mentors
    .map((mentor) => {
      const similarity = cosineSimilarity(queryEmbedding, mentor.embedding);
      return { mentor, similarity };
    })
    // Drop anything with invalid/zero similarity so junk doesn't sneak in
    .filter((item) => Number.isFinite(item.similarity) && item.similarity > 0);

  // Sort best match first
  scored.sort((a, b) => b.similarity - a.similarity);

  // Return top K — strip the heavy embedding array before sending back
  return scored.slice(0, topK).map(({ mentor, similarity }) => {
    const obj = mentor.toObject();
    delete obj.embedding;
    return { ...obj, similarity };
  });
};

/**
 * Generate and save an embedding for a mentor in MongoDB.
 */
export const insertInVectorDb = async (mentorText, mentor) => {
  const embedding = await createEmbedding(mentorText);

  if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("Invalid embedding generated");
  }

  const cleanEmbedding = embedding.filter(
    (v) => typeof v === "number" && isFinite(v)
  );
  if (cleanEmbedding.length === 0) {
    throw new Error("No valid embedding values after cleaning");
  }

  mentor.embedding = cleanEmbedding;
  await mentor.save();
  console.log("✅ Saved mentor embedding to MongoDB:", mentor._id.toString());
  return mentor.embedding;
};

export const setEmbeddingNull = async (mentorId) => {
  try {
    const mentor = await User.findById(mentorId);
    if (!mentor) throw new Error("Mentor not found");
    mentor.embedding = [];
    await mentor.save();
    console.log("✅ Cleared mentor embedding:", mentor._id.toString());
    return true;
  } catch (error) {
    console.error("❌ Error clearing mentor embedding:", error);
    return false;
  }
};
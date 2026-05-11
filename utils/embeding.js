export const createEmbedding = async (text) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: {
            parts: [{ text }],
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Embedding API error: ${JSON.stringify(err)}`);
    }

    const data = await response.json();
    return data.embedding.values;

  } catch (error) {
    console.error("Gemini embedding error:", error);
    throw error;
  }
};
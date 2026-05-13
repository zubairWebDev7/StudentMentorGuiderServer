async function generateWithGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topP: 0.8,
          maxOutputTokens: 800,
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Gemini response API error: ${JSON.stringify(data)}`);
  }

  console.log("Gemini finish reason:", data.candidates?.[0]?.finishReason);
  console.log("Gemini usage:", data.usageMetadata);

  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

  return text || "Sorry, I could not generate a suggestion right now.";
}

export { generateWithGemini };
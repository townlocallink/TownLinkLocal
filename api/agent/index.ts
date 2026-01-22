export const config = {
  runtime: "nodejs"
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API_KEY missing on server" });
    }

    const { history } = req.body || {};

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const contents = (history || []).map((m: any) => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: { temperature: 0.7 }
    });

    return res.status(200).json({ text: response.text });
  } catch (err: any) {
    console.error("Gemini API Failure:", err);
    return res.status(500).json({ error: err.message || "Gemini failed" });
  }
}


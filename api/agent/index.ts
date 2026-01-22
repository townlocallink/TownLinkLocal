export const config = {
  runtime: "nodejs"
};

const CATEGORIES = [
  "Sports", "Grocery", "Electronics", "Pharmacy", 
  "Fashion & Apparel", "Food & Bakery", "Books & Stationery", 
  "Hardware", "Home Decor", "Other"
];

const SYSTEM_INSTRUCTION = `
You are "LocalLink Sahayak", a helpful Local Shopping Assistant for Indian towns.
Help customers clarify what they want to buy from local shops.

1. TONE: Warm, friendly, local shopkeeper vibe. Use "Namaste".
2. CLARIFY: Ask 1-2 quick questions about specifics (size, brand, quantity).
3. LANGUAGE: Use English, Hindi, or Hinglish.
4. SUMMARIZE: Once clear, summarize: "Thik hai, aapko [item] chahiye. Kya main ye shops ko bhej doon? (Yes/No)".
5. CATEGORIZE: Select ONE from: ${CATEGORIES.join(", ")}.

CRITICAL:
- If user says "Yes" to summary, output ONLY this JSON: {"finalized": true, "summary": "Full summary of item and specs", "category": "EXACT_CATEGORY_NAME"}.
- Do NOT use markdown blocks for the JSON.
`;

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

    // Map and sanitize roles
    let contents = (history || []).map((m: any) => ({
      role: m.role === 'system' ? 'user' : m.role,
      parts: m.parts
    }));

    // Robust Role Sequence Fixer
    // Gemini API requirements:
    // 1. Must start with 'user'
    // 2. Roles must strictly alternate: user, model, user, model...
    const sequencedContents: any[] = [];
    for (const msg of contents) {
      if (sequencedContents.length === 0) {
        if (msg.role === 'user') {
          sequencedContents.push(msg);
        }
      } else {
        const lastRole = sequencedContents[sequencedContents.length - 1].role;
        if (msg.role !== lastRole) {
          sequencedContents.push(msg);
        } else {
          // If consecutive roles are the same (e.g. User followed by User due to previous failure),
          // we replace the previous entry with the newer one to maintain continuity.
          sequencedContents[sequencedContents.length - 1] = msg;
        }
      }
    }

    if (sequencedContents.length === 0) {
      return res.status(400).json({ error: "Invalid history sequence: Conversations must begin with a user message." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: sequencedContents,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7 
      }
    });

    const text = response.text || "Namaste! Main samajh nahi paaya. Kripya fir se batayein.";
    return res.status(200).json({ text });
  } catch (err: any) {
    console.error("Gemini API Error Handler:", err);
    return res.status(500).json({ error: err.message || "Something went wrong with Sahayak's brain." });
  }
}
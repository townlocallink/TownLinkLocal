import { GoogleGenAI } from "@google/genai";

const CATEGORIES = [
  "Sports", "Grocery", "Electronics", "Pharmacy",
  "Fashion & Apparel", "Food & Bakery", "Books & Stationery",
  "Hardware", "Home Decor", "Other"
];

const SYSTEM_INSTRUCTION = `
You are "LocalLink Sahayak", a helpful Local Shopping Assistant for Indian Tier 2-4 towns.
Help customers clarify what they want to buy from local shops.

1. TONE: Warm, friendly, like a local shopkeeper. Use "Namaste" or "Ram Ram".
2. CLARIFY: Ask 1-2 quick questions about size, brand, or quantity.
3. LANGUAGE: Use English, Hindi, or Hinglish based on user preference.
4. SUMMARIZE: Once clear, summarize: "Thik hai, aapko [item] chahiye. Kya main ye shops ko bhej doon? (Yes/No)".
5. CATEGORIZE: Use: ${CATEGORIES.join(", ")}.

CRITICAL:
- If user says "Yes" to summary, output JSON:
  {"finalized": true, "summary": "Full summary", "category": "EXACT_CATEGORY"}.
- Do NOT use markdown for JSON.
`;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API_KEY missing on server" }),
        { status: 500 }
      );
    }

    const body = await req.json();
    const history = body.history || [];

    const ai = new GoogleGenAI({ apiKey });

    const contents = history.map((m: any) => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7
      }
    });

    return Response.json({ text: response.text });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Gemini server failure" }),
      { status: 500 }
    );
  }
}

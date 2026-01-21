import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "./types";

export const CATEGORIES = [
  "Sports", "Grocery", "Electronics", "Pharmacy", 
  "Fashion & Apparel", "Food & Bakery", "Books & Stationery", 
  "Hardware", "Home Decor", "Other"
];

export const SYSTEM_INSTRUCTION = `
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

export const getAgentResponse = async (history: ChatMessage[]) => {
  try {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history })
    });

    const data = await res.json();

    if (data.error) {
      return { text: "Namaste! Thodi takleef aa rahi hai. Kripya baad mein koshish karein.", error: true };
    }

    return { text: data.text };
  } catch {
    return { text: "Network mein dikkat aa rahi hai.", error: true };
  }
};


export const parseAgentSummary = (text: string) => {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.category) {
        const found = CATEGORIES.find(c => c.toLowerCase() === parsed.category.toLowerCase());
        parsed.category = found || "Other";
      }
      return parsed;
    }
  } catch (e) {}
  return null;
};

export const generatePromoBanner = async (shopName: string, promotion: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Professional, colorful Indian storefront banner for "${shopName}" promoting "${promotion}". Vibrant retail colors.` }],
      },
    });
    
    const candidate = response.candidates?.[0];
    if (candidate) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (e) {
    console.error("Banner Generation Error:", e);
  }
  return null;
};
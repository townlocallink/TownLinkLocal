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
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.error("Gemini API Key missing.");
    return { 
      text: "Namaste! Maaf kijiye, connectivity mein thodi samasya hai. Kripya thodi der baad koshish karein.", 
      error: true 
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const contents = history
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role,
        parts: m.parts.map(p => {
          if (p.inlineData) {
            return { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data } };
          }
          return { text: p.text || "" };
        })
      }));

    if (contents.length > 0 && contents[0].role === 'model') {
      contents.unshift({ role: 'user', parts: [{ text: "Hello" }] });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    return { text: response.text || "" };
  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    return { 
      text: "Kshama kijiye, network thoda dhima hai. Kripya apna sandesh phir se bhejein.", 
      error: true 
    };
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
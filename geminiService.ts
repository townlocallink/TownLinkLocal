
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "./types";

export const CATEGORIES = [
  "Sports", "Grocery", "Electronics", "Pharmacy", 
  "Fashion & Apparel", "Food & Bakery", "Books & Stationery", 
  "Hardware", "Home Decor", "Other"
];

export const SYSTEM_INSTRUCTION = `
You are "LocalLink Sahayak", a helpful Local Shopping Assistant for Indian Tier 2-4 towns.
Help customers clarify what they want to buy from local shops.

1. TONE: Warm, friendly, like a local shopkeeper. Use "Namaste" or "Ram Ram".
2. CLARIFY: Ask 1-2 quick questions about size, brand, or quantity.
3. LANGUAGE: Use English, Hindi, or Hinglish based on user preference.
4. SUMMARIZE: Once clear, summarize: "Thik hai, aapko [item] chahiye. Kya main ye shops ko bhej doon? (Yes/No)".
5. CATEGORIZE: Use: ${CATEGORIES.join(", ")}.

CRITICAL:
- If user says "Yes" to summary, output JSON: {"finalized": true, "summary": "Full summary", "category": "EXACT_CATEGORY"}.
- Do NOT use markdown code blocks for JSON.
`;

export const getAgentResponse = async (history: ChatMessage[]) => {
  try {
    // The key MUST come from process.env.API_KEY as per system requirements.
    // If this is undefined, the Google SDK throws the "must be set" error.
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return { 
        text: "⚠️ CONFIGURATION ERROR: The API_KEY is missing from the environment. Please: \n1. Add 'API_KEY' to Vercel Environment Variables. \n2. Trigger a NEW REDEPLOY in Vercel.", 
        error: true 
      };
    }

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

    return { text: response.text || "Main sun raha hoon. Bolte rahiye..." };
  } catch (error: any) {
    console.error("Gemini Critical Error:", error);
    
    if (error?.message?.includes("API Key")) {
      return { text: "⚠️ API Key Error. Please ensure your Vercel project is redeployed with the correct key.", error: true };
    }
    
    return { text: "⚠️ Connection issue. Please try sending your message again.", error: true };
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
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Professional storefront banner for "${shopName}" promoting "${promotion}". Vibrant Indian retail style.` }],
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
    return null;
  } catch (e) {
    return null;
  }
};

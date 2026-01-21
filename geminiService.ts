
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
  const apiKey = process.env.API_KEY || "";
  
  if (!apiKey || apiKey.length < 10) {
    return { 
      text: "Developer: Please add your Gemini API_KEY to Vercel Settings.", 
      error: true 
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Clean history: Gemini requires strictly alternating USER/MODEL starting with USER.
    const turnHistory = history
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role,
        parts: m.parts.map(p => {
          // Fix: Correctly return either text or inlineData part to match the expected Part union type
          // instead of an object that potentially contains both properties.
          if (p.inlineData) {
            return { 
              inlineData: { 
                mimeType: p.inlineData.mimeType, 
                data: p.inlineData.data 
              } 
            };
          }
          return { text: p.text || "" };
        })
      }));

    // If history starts with model greeting, prepend a starting user message
    if (turnHistory.length > 0 && turnHistory[0].role === 'model') {
      turnHistory.unshift({
        role: 'user',
        parts: [{ text: "Hello Sahayak, I need to find something in the market." }]
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: turnHistory,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    return {
      text: response.text || "I didn't quite catch that. Could you repeat?",
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Return specific error hint if available
    const msg = error?.message || "";
    if (msg.includes("403") || msg.includes("API_KEY_INVALID")) {
      return { text: "API Key check karein, shayad invalid hai.", error: true };
    }
    return { 
      text: "Connection thoda weak hai. Ek baar phir try karein?", 
      error: true 
    };
  }
};

export const generatePromoBanner = async (shopName: string, promotion: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Professional storefront banner for "${shopName}" promoting "${promotion}". Vibrant Indian retail style.`,
          },
        ],
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

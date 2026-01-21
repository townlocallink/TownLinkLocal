
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
    const apiKey = process.env.API_KEY as string;
    if (!apiKey) {
      console.error("LocalLink: No API_KEY found in process.env");
      return { text: "Error: API Key missing in environment.", error: true };
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Gemini requires turn-based history to START with 'user' role.
    const turnHistory = history
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

    // If history starts with model greeting, prepend a dummy user message to satisfy role sequence
    if (turnHistory.length > 0 && turnHistory[0].role === 'model') {
      turnHistory.unshift({
        role: 'user',
        parts: [{ text: "Hi Sahayak, I need to buy something." }]
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
      text: response.text || "I'm here to help. Could you tell me more?",
    };
  } catch (error: any) {
    // Log the EXACT error to console so you can see if it's a billing issue
    console.error("GEMINI API CRITICAL ERROR:", error);
    
    let userMsg = "Connection thoda weak hai. Ek baar phir try karein?";
    if (error?.message?.includes("402") || error?.message?.includes("billing")) {
      userMsg = "Billing setup incomplete. Please check Google AI Studio.";
    } else if (error?.message?.includes("403")) {
      userMsg = "API Key check karein, access denied.";
    }

    return { 
      text: userMsg, 
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
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
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
    console.error("Banner Generation Error:", e);
    return null;
  }
};

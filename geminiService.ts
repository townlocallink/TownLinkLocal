
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
    // Attempt to get the key from process.env (Vercel injected)
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      console.error("LocalLink: API_KEY not found in environment.");
      return { 
        text: "⚠️ Environment Sync Error: The app cannot see your API_KEY. Please go to Vercel -> Deployments and click 'Redeploy' on your latest build to sync environment variables.", 
        error: true 
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Ensure history follows User -> Model pattern
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

    if (turnHistory.length > 0 && turnHistory[0].role === 'model') {
      turnHistory.unshift({
        role: 'user',
        parts: [{ text: "Hi Sahayak, I need to buy something from the market." }]
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
      text: response.text || "I'm listening. Tell me more?",
    };
  } catch (error: any) {
    console.error("Gemini Critical Error:", error);
    
    let userMsg = "Connection thoda weak hai. Ek baar phir try karein?";
    const errStr = error?.toString() || "";
    
    if (errStr.includes("402") || errStr.includes("quota") || errStr.includes("billing")) {
      userMsg = "⚠️ Billing required: Please check your Google AI Studio billing status.";
    } else if (errStr.includes("403") || errStr.includes("API key not valid")) {
      userMsg = "⚠️ Invalid API Key: Please check the key in your Vercel Environment Variables.";
    }

    return { text: userMsg, error: true };
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

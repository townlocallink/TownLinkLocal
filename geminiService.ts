
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "./types";

export const CATEGORIES = [
  "Sports", "Grocery", "Electronics", "Pharmacy", 
  "Fashion & Apparel", "Food & Bakery", "Books & Stationery", 
  "Hardware", "Home Decor", "Other"
];

export const SYSTEM_INSTRUCTION = `
You are "LocalLink Sahayak", an expert Local Shopping Assistant for a hyperlocal marketplace in Tier 2-4 Indian towns.
Your goal is to help customers clarify exactly what they want to buy from local shops.

1. START: Be extremely friendly. Use a warm, helpful "shopkeeper" tone. Use greetings like "Namaste" or "Ram Ram".
2. CLARIFY: Ask relevant questions (size, brand preference, quantity, weight). Only ask 1-2 questions at a time.
3. LANDMARKS: If the user mentions local landmarks (e.g., "near the clock tower"), acknowledge them.
4. LOCAL DISCOVERY: If no registered shop is mentioned, you can use Google Maps to find real-world shops nearby to help the user.
5. LANGUAGE: Analyze user's language. Use English, Hindi, or Hinglish as they prefer.
6. SUMMARIZE: Once clear, summarize: "Thik hai, aapko 1kg Tata Tea Gold chahiye jo Clock Tower ke pass mile. Kya main ye shops ko bhej doon? (Yes/No)".
7. CATEGORIZE: Use one of these: ${CATEGORIES.join(", ")}.

CRITICAL:
- If the user says "Yes" to the summary, output a final JSON block: {"finalized": true, "summary": "Detailed summary here", "category": "EXACT_CATEGORY"}.
- If you are in VOICE mode (Live API), your summary must be spoken clearly before the JSON is sent.
- DO NOT wrap the JSON in markdown code blocks.
`;

export const getAgentResponse = async (history: ChatMessage[], location?: { latitude: number, longitude: number }) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: history.map(m => ({ 
        role: m.role === 'system' ? 'user' : m.role, 
        parts: m.parts 
      })),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        tools: [{ googleMaps: {} }],
        ...(location && {
          toolConfig: {
            retrievalConfig: {
              latLng: location
            }
          }
        })
      },
    });

    return {
      text: response.text || "I'm thinking... but nothing came out. Try again?",
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return { 
      text: "Maaf kijiye bhai, connection mein thodi dikkat aa rahi hai. Kya aap phir se try kar sakte hain?", 
      error: true 
    };
  }
};

export const generatePromoBanner = async (shopName: string, promotion: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Create a high-quality professional storefront banner for a shop named "${shopName}". The banner should promote: "${promotion}". Style: Modern Indian retail, vibrant colors, clean typography, welcoming atmosphere.`,
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
    console.error("Banner generation failed", e);
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

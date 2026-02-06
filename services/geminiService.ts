
import { GoogleGenAI, Type } from "@google/genai";

// Standardize Gemini API interaction according to guidelines
export const generateVideoMetadata = async (topic: string, niche: string) => {
  // Always initialize GoogleGenAI inside the function with named parameter apiKey
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Fix: Use gemini-3-pro-preview for advanced reasoning/creative tasks
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Generate viral YouTube metadata (title, description, tags) for a video about "${topic}" in the "${niche}" niche.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          tags: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "description", "tags"]
      }
    }
  });

  try {
    // response.text is a property, not a method
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return null;
  }
};

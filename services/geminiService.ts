import { GoogleGenAI, Type } from "@google/genai";
import { BankRate } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not defined in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeRates = async (rates: BankRate[], userQuery: string): Promise<string> => {
  try {
    const ai = getClient();
    
    // Prepare context from rates
    const ratesContext = rates.map(r => 
      `- ${r.bankName}: ${r.interestRate}% for ${r.maturityDays} days (Min: ${r.minAmount} TL). Benefits: ${r.benefits.join(', ')}`
    ).join('\n');

    const prompt = `
      You are a financial advisor expert in Turkish Banking. 
      Analyze the following current interest rates:
      ${ratesContext}

      User Question: "${userQuery}"

      Please provide a concise, helpful answer. Recommend the best option based on the user's need. 
      If the user asks about inflation or real returns, give a general warning about TRY inflation.
      Format your response with Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful fintech assistant named FaizBul AI.",
        temperature: 0.7,
      }
    });

    return response.text || "I could not generate an analysis at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I am unable to connect to the AI service right now. Please check your API key.";
  }
};

export const getRateInsights = async (rates: BankRate[]) => {
    try {
        const ai = getClient();
        const ratesContext = rates.map(r => 
            `${r.bankName} (${r.interestRate}%)`
          ).join(', ');
        
        const prompt = `
            Given these Turkish bank interest rates: ${ratesContext}.
            Generate a very short JSON summary with two fields:
            1. "marketTrend": A short string describing if rates are high or low generally.
            2. "topPick": The name of the bank with the best value proposition (consider rate).
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        marketTrend: { type: Type.STRING },
                        topPick: { type: Type.STRING }
                    }
                }
            }
        });
        
        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("Insight generation failed", e);
        return { marketTrend: "Stable", topPick: "N/A" };
    }
}
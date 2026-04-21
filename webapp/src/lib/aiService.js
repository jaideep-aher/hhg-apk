"use server";

import { GoogleGenAI } from "@google/genai";

export async function generateMarketAnalysis(itemName, dataPoints, interval) {
  try {
    if (!process.env.API_KEY) {
      return "AI विश्लेषण अनुपलब्ध :( कृपया नंतर पुन्हा प्रयत्न करा.";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const contextData = dataPoints
      .slice(-30)
      .map((d) => `${d.date}: सरासरी ₹${d.avgRate}, आवक ${d.volume}kg`)
      .join("\n");

    const prompt = `
      Act as an agricultural market expert for Maharashtra, India. Analyze the recent ${interval} trends for "${itemName}".
      Data (last 10 points):
      ${contextData}
      
      Provide a concise 3-sentence insight in Marathi language (मराठी).
      Focus on:
      1. Price volatility (दर चढ-उतार).
      2. Volume correlation (आवक आणि दर संबंध).
      3. Short-term forecast (पुढील काही दिवसांचा अंदाज).
      
      Use simple agricultural terminology familiar to farmers (e.g., तेजी, मंदी, आवक, बाजारभाव).
      Do not use markdown formatting.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 250,
      },
    });

    return response.text || "विश्लेषण तयार करता आले नाही.";
  } catch (error) {
    console.error("AI Generation Error:", error);
    return "AI विश्लेषण सध्या उपलब्ध नाही. कृपया नंतर पुन्हा प्रयत्न करा.";
  }
}

// functions/src/index.ts

import {onCall} from "firebase-functions/v2/https";
import {initializeApp} from "firebase-admin/app";
import {GoogleGenerativeAI} from "@google/generative-ai";
import {error as logError, info as logInfo} from "firebase-functions/logger";

initializeApp();

const apiKey = process.env.GEMINI_KEY;
if (!apiKey) {
  logError("GEMINI_KEY niet ingesteld in Firebase Functions configuratie!");
}
const genAI = new GoogleGenerativeAI(apiKey as string);

export const generateSummary = onCall(async (request) => {
  logInfo("generateSummary aangeroepen met data:", {data: request.data});

  if (!request.data.prompt) {
    logError("Geen prompt meegegeven in de request.");
    throw new Error("Er is geen prompt opgegeven.");
  }

  try {
    const model = genAI.getGenerativeModel({model: "gemini-1.5-flash"});
    const prompt = request.data.prompt;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    logInfo("Succesvol antwoord van Gemini API ontvangen.");
    return {summary: text};
  } catch (error) {
    logError("Fout bij het aanroepen van de Gemini API:", error);
    throw new Error(
      "Er is een fout opgetreden bij het genereren van de samenvatting.",
    );
  }
});

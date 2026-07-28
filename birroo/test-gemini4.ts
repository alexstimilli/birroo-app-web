import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const res = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: "hi" });
    console.log("Success 2.5:", res.text);
  } catch(e) {
    console.error("Error 2.5:", e.message);
  }
}
run();

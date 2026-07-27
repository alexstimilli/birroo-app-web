import { GoogleGenAI } from "@google/genai";
console.log("Key:", process.env.GEMINI_API_KEY ? "EXISTS" : "MISSING");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "hello",
    });
    console.log("Success:", result.text);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();

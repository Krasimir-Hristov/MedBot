import OpenAI from "openai";

const apiKey = process.env.OPENROUTER_API_KEY || "";
const baseURL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

export const openrouter = new OpenAI({
  apiKey,
  baseURL,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "MedScan RAG",
  },
});

export const AI_MODELS = {
  vision: process.env.VISION_MODEL || "google/gemini-3.8-flash",
  embedding: process.env.EMBEDDING_MODEL || "openai/text-embedding-3-small",
  chat: process.env.CHAT_MODEL || "deepseek/deepseek-v4.1-flash",
  fast: process.env.FAST_MODEL || "deepseek/deepseek-v4.1-flash",
  audio: process.env.AUDIO_MODEL || "openai/whisper-large-v3",
} as const;

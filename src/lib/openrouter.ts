import OpenAI from "openai";

const rawKey = process.env.OPENROUTER_API_KEY?.trim() || "";
const cleanKey = rawKey === '""' || rawKey === "''" ? "" : rawKey;
const apiKey = cleanKey || "dummy-build-key";
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
  /** Модел с огромен контекст (1M) за обобщение на цялото досие наведнъж. */
  longContext: process.env.LONG_CONTEXT_MODEL || "google/gemini-3.8-flash",
  /**
   * Модел за транскрипция на глас (диктовка).
   * ВАЖНО: използва се САМО през `/api/v1/audio/transcriptions` (STT endpoint),
   * НЕ през `/chat/completions` – там моделът се отхвърля с грешка 400.
   */
  audio: process.env.AUDIO_MODEL || "openai/whisper-large-v3",
} as const;

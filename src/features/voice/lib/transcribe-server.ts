import 'server-only'
import { AI_MODELS } from '@/lib/openrouter'
import type { TranscribeRequest, TranscribeResponse } from '../schemas'

export class TranscriptionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 502
  ) {
    super(message)
    this.name = 'TranscriptionError'
  }
}

/**
 * Изпраща аудио към OpenRouter Speech-to-Text endpoint (/api/v1/audio/transcriptions).
 * Модел: openai/whisper-large-v3.
 */
export const transcribeAudioWithWhisper = async (
  payload: TranscribeRequest
): Promise<TranscribeResponse> => {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new TranscriptionError('AI услугата за аудио транскрипция не е конфигурирана.', 500)
  }

  // Премахваме евентуален data URL префикс (data:audio/webm;base64,...)
  const rawBase64 = payload.audioBase64.includes(',')
    ? payload.audioBase64.split(',')[1] ?? ''
    : payload.audioBase64

  if (!rawBase64) {
    throw new TranscriptionError('Невалидни аудио данни.', 400)
  }

  const endpoint = 'https://openrouter.ai/api/v1/audio/transcriptions'

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'MedScan RAG',
      },
      body: JSON.stringify({
        model: AI_MODELS.audio || 'openai/whisper-large-v3',
        input_audio: {
          data: rawBase64,
          format: payload.format,
        },
        language: payload.language,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenRouter Whisper failed:', response.status, errorText)
      throw new TranscriptionError('Грешка при обработка на гласовия запис от AI модела.')
    }

    const data = (await response.json()) as { text?: string; usage?: { duration?: number } }
    const transcribedText = (data.text || '').trim()

    return {
      text: transcribedText,
      durationSeconds: data.usage?.duration,
    }
  } catch (error) {
    if (error instanceof TranscriptionError) throw error
    console.error('Whisper transcription request error:', error)
    throw new TranscriptionError('Възникна мрежова грешка при гласовото разпознаване.')
  }
}

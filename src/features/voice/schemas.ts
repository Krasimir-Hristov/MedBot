import { z } from 'zod'

export const TranscribeRequestSchema = z.object({
  audioBase64: z
    .string()
    .min(10, 'Липсват аудио данни.')
    .max(8_000_000, 'Аудио файлът е твърде голям за транскрипция (макс. 6MB).'),
  format: z.enum(['webm', 'mp4', 'ogg', 'wav', 'mp3', 'm4a']).default('webm'),
  language: z.enum(['bg', 'el']).default('bg'),
})

export type TranscribeRequest = z.infer<typeof TranscribeRequestSchema>

export interface TranscribeResponse {
  text: string
  durationSeconds?: number
}

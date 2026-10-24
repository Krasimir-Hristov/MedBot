import 'server-only'
import { AI_MODELS, openrouter } from '@/lib/openrouter'
import type { DocumentClinicalMetadata } from '@/features/documents'
import { buildVisionSystemPrompt, buildVisionUserPrompt } from './prompts'
import { VisionOcrResultSchema, type VisionOcrResult } from '../schemas'

const EMBEDDING_DIMENSIONS = 1536
const MAX_SEMANTIC_TEXT_CHARS = 10_000

/**
 * Грешка от AI конвейера със съобщение, безопасно за показване на клиента.
 */
export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly status: number = 502
  ) {
    super(message)
    this.name = 'PipelineError'
  }
}

const ensureApiKey = (): void => {
  const rawKey = process.env.OPENROUTER_API_KEY?.trim()
  if (!rawKey || rawKey === '""' || rawKey === "''") {
    throw new PipelineError('AI услугата (OpenRouter) изисква валиден OPENROUTER_API_KEY в .env.', 500)
  }
}

/**
 * Извлича JSON обект от свободен текстов отговор (премахва ```json блокове и околен текст).
 */
const parseJsonObject = (raw: string): unknown => {
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw new PipelineError('Моделът не върна валиден резултат. Опитайте отново.')
  }
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    throw new PipelineError('Моделът върна невалиден JSON. Опитайте отново.')
  }
}

/**
 * Мултимодален OCR + клиничен анализ на сканиран документ (Gemini през OpenRouter).
 * @param imageDataUrl компресиран JPEG във формат `data:image/jpeg;base64,...`
 */
export const extractMedicalDocumentData = async (
  imageDataUrl: string,
  fileName: string
): Promise<VisionOcrResult> => {
  ensureApiKey()

  let content: string
  try {
    const completion = await openrouter.chat.completions.create({
      model: AI_MODELS.vision,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildVisionSystemPrompt(new Date().toISOString().slice(0, 10)) },
        {
          role: 'user',
          content: [
            { type: 'text', text: buildVisionUserPrompt(fileName) },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
    })
    content = completion.choices[0]?.message?.content ?? ''
  } catch (error) {
    console.error('Vision OCR request failed:', error)
    throw new PipelineError('AI услугата за разчитане на документи е временно недостъпна.')
  }

  if (!content) {
    throw new PipelineError('Моделът не върна резултат. Опитайте отново.')
  }

  const parsed = VisionOcrResultSchema.safeParse(parseJsonObject(content))
  if (!parsed.success) {
    console.error('Vision OCR validation failed:', parsed.error.issues)
    throw new PipelineError('Не успяхме да разчетем документа. Опитайте с по-ясно изображение.')
  }
  return parsed.data
}

interface SemanticTextInput {
  titleBg: string
  titleEl: string
  docDate: string
  category: string
  summaryEl: string
  metadata: DocumentClinicalMetadata
  extractedText: string
}

/**
 * Двуезичен (BG + EL) семантичен текст, върху който се изчислява векторът за RAG.
 */
export const buildBilingualSemanticText = (input: SemanticTextInput): string => {
  const { metadata } = input
  const lines = [
    `Документ / Έγγραφο: ${input.titleBg} / ${input.titleEl}`,
    `Категория / Κατηγορία: ${input.category}`,
    `Дата / Ημερομηνία: ${input.docDate}`,
    metadata.keyMarkers.length > 0
      ? `Маркери / Δείκτες: ${metadata.keyMarkers.join('; ')}`
      : '',
    metadata.staging ? `Стадий / Στάδιο: ${metadata.staging}` : '',
    metadata.criticalAlerts.length > 0
      ? `Предупреждения / Προειδοποιήσεις: ${metadata.criticalAlerts.join('; ')}`
      : '',
    metadata.hospital ? `Болница / Νοσοκομείο: ${metadata.hospital}` : '',
    metadata.doctor ? `Лекар / Ιατρός: ${metadata.doctor}` : '',
    `Резюме / Περίληψη: ${input.summaryEl}`,
    `Текст / Κείμενο: ${input.extractedText}`,
  ]

  return lines.filter(Boolean).join('\n').slice(0, MAX_SEMANTIC_TEXT_CHARS)
}

/**
 * Генерира 1536-измерен вектор (`openai/text-embedding-3-small`) за pgvector.
 */
export const createMedicalEmbedding = async (semanticText: string): Promise<number[]> => {
  ensureApiKey()

  try {
    const response = await openrouter.embeddings.create({
      model: AI_MODELS.embedding,
      input: semanticText,
    })

    const embedding = response.data[0]?.embedding
    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Unexpected embedding length: ${embedding?.length ?? 'none'}`)
    }
    return embedding
  } catch (error) {
    console.error('Embedding request failed:', error)
    throw new PipelineError('Неуспешно генериране на семантичен вектор. Опитайте отново.')
  }
}

/**
 * Конструира клиничните метаданни за JSONB колоната от резултата на модела.
 */
export const toClinicalMetadata = (result: VisionOcrResult): DocumentClinicalMetadata => ({
  hospital: result.hospital ?? undefined,
  doctor: result.doctor ?? undefined,
  staging: result.staging ?? undefined,
  keyMarkers: result.key_markers,
  criticalAlerts: result.critical_alerts,
})

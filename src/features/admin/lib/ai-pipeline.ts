import 'server-only'
import { AI_MODELS, openrouter } from '@/lib/openrouter'
import type { DocumentClinicalMetadata } from '@/features/documents'
import { buildVisionSystemPrompt, buildVisionUserPrompt } from './prompts'
import { VisionOcrResultSchema, type VisionOcrResult } from '../schemas'

/** Векторна размерност на `openai/text-embedding-3-small` (синхронизирана с `pgvector`). */
const EMBEDDING_DIMENSIONS = 1536

/**
 * Контекстният прозорец на `openai/text-embedding-3-small` е 8192 токена.
 * Работим с бюджет, а НЕ с брой символи: гръцкият текст изразходва ~1 токен/знак
 * (10 000 знака ≈ 11 500 токена → грешка 400), докато латиницата е ~0.2–0.65 токена/знак.
 * Оставяме буфер от ~1200 токена за структурираната глава и заглавните редове.
 */
const MAX_EMBEDDING_INPUT_TOKENS = 7000

/** По-агресивен бюджет при принудително повторение след грешка за надвишен контекст. */
const RETRY_EMBEDDING_INPUT_TOKENS = 4000

/** Маркер, който отбелязва съкратената среда на дълга транскрипция. */
const TRUNCATION_MARKER = '\n[… съкратено / περικομμένο …]\n'

/**
 * Приблизителна оценка на броя токени без външен tokenizer.
 * Теглата са калибрирани с реални измервания срещу `openai/text-embedding-3-small`:
 * гръцки ~0.96–1.15, кирилица ~0.51, латиница с числа/символи ~0.61, латиница проза ~0.20 токена/знак.
 * Оценката умишлено е леко завишена (закръгля нагоре), за да не надхвърлим контекста.
 */
export const estimateTokens = (text: string): number => {
  let tokens = 0
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index)
    if (code < 0x0080) {
      tokens += 0.65
    } else if (code >= 0x0400 && code <= 0x04ff) {
      tokens += 0.55
    } else if (code >= 0x0370 && code <= 0x03ff) {
      tokens += 1.15
    } else if (code >= 0x1f00 && code <= 0x1fff) {
      tokens += 1.15
    } else {
      tokens += 1
    }
  }
  return Math.ceil(tokens)
}

/**
 * Отрязва текст до зададен токен бюджет чрез двоично търсене по дължина на низа.
 * @param from 'start' пази началото, 'end' пази края на текста.
 */
const takeWithinTokenBudget = (text: string, budget: number, from: 'start' | 'end'): string => {
  if (budget <= 0) {
    return ''
  }
  if (estimateTokens(text) <= budget) {
    return text
  }

  let low = 0
  let high = text.length
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    const candidate = from === 'start' ? text.slice(0, middle) : text.slice(text.length - middle)
    if (estimateTokens(candidate) <= budget) {
      low = middle
    } else {
      high = middle - 1
    }
  }

  return from === 'start' ? text.slice(0, low) : text.slice(text.length - low)
}

/**
 * Съкращава дълга транскрипция, като пази едновременно началото и края ѝ
 * (диагнозата е в началото, а заключението и подписът – в края).
 */
export const truncateToTokenBudget = (text: string, budget: number): string => {
  if (budget <= 0) {
    return ''
  }
  if (estimateTokens(text) <= budget) {
    return text
  }

  const markerTokens = estimateTokens(TRUNCATION_MARKER)
  const usable = Math.max(budget - markerTokens, 1)
  const headBudget = Math.floor(usable * 0.6)
  const tailBudget = usable - headBudget

  const head = takeWithinTokenBudget(text, headBudget, 'start')
  const tail = takeWithinTokenBudget(text, tailBudget, 'end')
  return `${head}${TRUNCATION_MARKER}${tail}`
}

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
 * Максимален брой токени за отговора на vision модела.
 * 16 000 е достатъчно за JSON с пълна транскрипция на плътен медицински скан
 * (измерено: ~9600 токена за 60-редов документ), но ограничава времето за отговор.
 */
const VISION_MAX_TOKENS = 16_000

/**
 * Ниво на reasoning за vision модела. `low` намалява латентността (измерено 57s → 43s
 * за плътен гръцки скан) без загуба на точност при OCR — структурираният JSON
 * се извлича също толкова пълно, колкото и при ниво по подразбиране.
 */
const VISION_REASONING_EFFORT = 'low'

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
      max_tokens: VISION_MAX_TOKENS,
      reasoning_effort: VISION_REASONING_EFFORT,
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

    // Отбелязваме отрязан отговор, за да не създаваме непълна транскрипция тихо.
    if (completion.choices[0]?.finish_reason === 'length') {
      console.warn(`Vision OCR output was truncated by max_tokens for file: ${fileName}`)
    }
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
 *
 * Структурираната клинична глава (заглавие, категория, маркери, стадий, резюме) се пази
 * ИЗЦЯЛО, а пълната транскрипция се съкращава по токен бюджет, така че заявката към
 * embedding модела никога да не надхвърли контекстния му прозорец (8192 токена).
 *
 * @param tokenBudget максимален брой токени за целия текст (по подразбиране `MAX_EMBEDDING_INPUT_TOKENS`)
 */
export const buildBilingualSemanticText = (
  input: SemanticTextInput,
  tokenBudget: number = MAX_EMBEDDING_INPUT_TOKENS
): string => {
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
  ].filter(Boolean)

  const header = lines.join('\n')
  const transcriptPrefix = '\nТекст / Κείμενο: '
  const headerTokens = estimateTokens(header) + estimateTokens(transcriptPrefix)
  const transcriptBudget = Math.max(tokenBudget - headerTokens, 0)

  return `${header}${transcriptPrefix}${truncateToTokenBudget(input.extractedText, transcriptBudget)}`
}

/**
 * Разпознава грешка за надвишен контекстен прозорец от доставчика (HTTP 400).
 */
const isContextLengthError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false
  }
  const candidate = error as { status?: unknown; message?: unknown }
  if (candidate.status !== 400) {
    return false
  }
  return typeof candidate.message === 'string' && /context length/i.test(candidate.message)
}

/**
 * Генерира 1536-измерен вектор (`openai/text-embedding-3-small`) за pgvector.
 *
 * Ако доставчикът върне грешка за надвишен контекстен прозорец (напр. заради
 * неточна оценка на токените), заявката се повтаря веднъж с по-малък бюджет,
 * за да не се губи документът заради един нечетим дълъг скан.
 */
export const createMedicalEmbedding = async (semanticText: string): Promise<number[]> => {
  ensureApiKey()

  const request = async (input: string): Promise<number[]> => {
    const response = await openrouter.embeddings.create({
      model: AI_MODELS.embedding,
      input,
    })

    const embedding = response.data[0]?.embedding
    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Unexpected embedding length: ${embedding?.length ?? 'none'}`)
    }
    return embedding
  }

  try {
    return await request(semanticText)
  } catch (error) {
    if (!isContextLengthError(error)) {
      console.error('Embedding request failed:', error)
      throw new PipelineError('Неуспешно генериране на семантичен вектор. Опитайте отново.')
    }

    console.warn('Embedding input exceeded context window. Retrying with a reduced budget.')
    try {
      return await request(truncateToTokenBudget(semanticText, RETRY_EMBEDDING_INPUT_TOKENS))
    } catch (retryError) {
      console.error('Embedding retry failed:', retryError)
      throw new PipelineError('Неуспешно генериране на семантичен вектор. Опитайте отново.')
    }
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

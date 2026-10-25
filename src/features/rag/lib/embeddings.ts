import 'server-only'
import { AI_MODELS, openrouter } from '@/lib/openrouter'
import {
  estimateTokens,
  truncateToTokenBudget,
} from '@/features/admin/lib/ai-pipeline'

export { estimateTokens, truncateToTokenBudget }

const EMBEDDING_DIMENSIONS = 1536
const SAFE_EMBEDDING_TOKEN_BUDGET = 7_000

export class RagError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 502
  ) {
    super(message)
    this.name = 'RagError'
  }
}

/**
 * Изчислява 1536-измерен вектор чрез openai/text-embedding-3-small
 */
export const createEmbedding = async (input: string): Promise<number[]> => {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new RagError('AI услугата за векторизация не е конфигурирана.', 500)
  }

  const safeInput = truncateToTokenBudget(input.trim(), SAFE_EMBEDDING_TOKEN_BUDGET)
  if (!safeInput) {
    throw new RagError('Не може да се генерира вектор от празен текст.', 400)
  }

  try {
    const response = await openrouter.embeddings.create({
      model: AI_MODELS.embedding,
      input: safeInput,
    })

    const embedding = response.data[0]?.embedding
    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Невалидни измерения на вектора: ${embedding?.length ?? 'none'}`)
    }
    return embedding
  } catch (error) {
    console.error('Embedding generation failed:', error)
    throw new RagError('Неуспешно генериране на семантичен вектор за търсене.')
  }
}

/**
 * Двуезично разширяване на въпроса (BG -> BG + EL + Латински медицински термини)
 */
export const expandBilingualQuery = async (query: string): Promise<string> => {
  if (!query.trim()) return ''

  try {
    const completion = await openrouter.chat.completions.create({
      model: AI_MODELS.fast,
      temperature: 0,
      max_tokens: 250,
      messages: [
        {
          role: 'system',
          content: `You are an oncology search term expander. Given a patient or doctor question in Bulgarian or Greek, output a single concise search line containing relevant medical synonyms, Greek translations, Bulgarian terms and standard medical acronyms (e.g. CA 15-3, CEA, CT, RECIST, TNM, histology, biopsy, diet, therapy). Do not output full sentences or explanations. Output only search keywords separated by spaces.`,
        },
        {
          role: 'user',
          content: query,
        },
      ],
    })

    const expanded = completion.choices[0]?.message?.content?.trim()
    if (expanded && expanded.length > 2) {
      return `${query} ${expanded}`
    }
  } catch (error) {
    console.warn('Bilingual query expansion skipped on error:', error)
  }

  return query
}

import 'server-only'
import { estimateTokens, truncateToTokenBudget } from '@/features/admin/lib/ai-pipeline'
import type { DossierSourceDocument } from '../types'

/**
 * Бюджет (оценени токени) за входа с цялото досие. Моделите с дълъг контекст имат 1M токена,
 * така че оставяме голям запас за системния промпт и отговора. Бюджетът е в ТОКЕНИ, не в символи.
 */
export const DOSSIER_INPUT_TOKEN_BUDGET = 400_000

export interface DossierContext {
  text: string
  /** Колко документа са имали съкратен OCR текст (0 при нормално досие). */
  truncatedDocCount: number
  estimatedTokens: number
}

/** Клиничната глава на документа – пази се ВИНАГИ изцяло. */
const buildHeader = (doc: DossierSourceDocument): string => {
  const { metadata } = doc
  return [
    `=== ДОКУМЕНТ [ID: ${doc.id}] ===`,
    `Заглавие: ${doc.titleEl} / ${doc.titleBg}`,
    `Дата: ${doc.docDate} | Категория: ${doc.category}`,
    metadata.hospital ? `Болница/Νοσοκομείο: ${metadata.hospital}` : '',
    metadata.doctor ? `Лекар/Ιατρός: ${metadata.doctor}` : '',
    metadata.staging ? `Стадий/Στάδιο: ${metadata.staging}` : '',
    metadata.keyMarkers.length > 0 ? `Маркери/Δείκτες: ${metadata.keyMarkers.join('; ')}` : '',
    metadata.criticalAlerts.length > 0
      ? `Предупреждения/Προειδοποιήσεις: ${metadata.criticalAlerts.join('; ')}`
      : '',
    `Резюме: ${doc.summaryEl}`,
    'Пълен текст:',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Разпределя бюджета справедливо (water-filling): късите транскрипции влизат цели,
 * а неизползваният им бюджет се преразпределя към дългите.
 */
const allocateTranscriptBudgets = (needs: number[], totalBudget: number): number[] => {
  const budgets = needs.map(() => 0)
  let remaining = Math.max(totalBudget, 0)
  let open = needs.map((_, i) => i)

  while (open.length > 0 && remaining > 0) {
    const share = Math.floor(remaining / open.length)
    const satisfied = open.filter((i) => needs[i] - budgets[i] <= share)

    if (satisfied.length === 0) {
      open.forEach((i) => {
        budgets[i] += share
      })
      break
    }

    satisfied.forEach((i) => {
      const grant = needs[i] - budgets[i]
      budgets[i] += grant
      remaining -= grant
    })
    open = open.filter((i) => !satisfied.includes(i))
  }

  return budgets
}

/**
 * Сглобява хронологичния текст на цялото досие в зададен токен бюджет.
 * Клиничните глави се пазят изцяло; съкращава се само OCR текстът (начало + край).
 */
export const buildDossierContext = (
  docs: DossierSourceDocument[],
  totalBudget: number = DOSSIER_INPUT_TOKEN_BUDGET
): DossierContext => {
  const headers = docs.map(buildHeader)
  const headerTokens = headers.reduce((sum, h) => sum + estimateTokens(h), 0)
  const needs = docs.map((d) => estimateTokens(d.extractedText))
  const budgets = allocateTranscriptBudgets(needs, totalBudget - headerTokens)

  let truncatedDocCount = 0
  const blocks = docs.map((doc, i) => {
    const fits = needs[i] <= budgets[i]
    if (!fits) truncatedDocCount += 1
    const body = fits ? doc.extractedText : truncateToTokenBudget(doc.extractedText, budgets[i])
    return `${headers[i]}\n${body}`
  })

  const text = blocks.join('\n\n')
  return { text, truncatedDocCount, estimatedTokens: estimateTokens(text) }
}

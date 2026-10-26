import 'server-only'
import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dossierSummaries, medicalDocuments } from '@/lib/db/schema'
import type { DossierSummaryItem, DossierSummaryState, SummaryStaleness } from './types'

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'number')

/**
 * Последното записано обобщение на досието (или null, ако още няма).
 */
export const getLatestDossierSummary = async (): Promise<DossierSummaryItem | null> => {
  try {
    const rows = await db
      .select()
      .from(dossierSummaries)
      .orderBy(desc(dossierSummaries.createdAt))
      .limit(1)

    const row = rows[0]
    if (!row) return null

    return {
      id: row.id,
      contentEl: row.contentEl,
      documentIds: isNumberArray(row.documentIds) ? row.documentIds : [],
      documentCount: row.documentCount,
      truncatedDocCount: row.truncatedDocCount,
      model: row.model,
      createdAt: row.createdAt.toISOString(),
    }
  } catch (error) {
    console.error('Error fetching latest dossier summary:', error)
    throw new Error('Грешка при зареждане на последното обобщение.')
  }
}

export const saveDossierSummary = async (input: {
  contentEl: string
  documentIds: number[]
  truncatedDocCount: number
  model: string
}): Promise<DossierSummaryItem> => {
  try {
    const rows = await db
      .insert(dossierSummaries)
      .values({
        contentEl: input.contentEl,
        documentIds: input.documentIds,
        documentCount: input.documentIds.length,
        truncatedDocCount: input.truncatedDocCount,
        model: input.model,
      })
      .returning()

    const row = rows[0]
    if (!row) throw new Error('Insert returned no rows')

    return {
      id: row.id,
      contentEl: row.contentEl,
      documentIds: input.documentIds,
      documentCount: row.documentCount,
      truncatedDocCount: row.truncatedDocCount,
      model: row.model,
      createdAt: row.createdAt.toISOString(),
    }
  } catch (error) {
    console.error('Error saving dossier summary:', error)
    throw new Error('Грешка при запис на обобщението.')
  }
}

/**
 * Сравнява ID-тата на документите в обобщението с текущите в базата.
 */
export const computeStaleness = async (
  summary: DossierSummaryItem | null
): Promise<SummaryStaleness> => {
  if (!summary) return { newCount: 0, removedCount: 0 }
  try {
    const rows = await db.select({ id: medicalDocuments.id }).from(medicalDocuments)
    const current = new Set(rows.map((r) => r.id))
    const summarized = new Set(summary.documentIds)
    let newCount = 0
    current.forEach((id) => {
      if (!summarized.has(id)) newCount += 1
    })
    let removedCount = 0
    summarized.forEach((id) => {
      if (!current.has(id)) removedCount += 1
    })
    return { newCount, removedCount }
  } catch (error) {
    console.error('Error computing summary staleness:', error)
    throw new Error('Грешка при проверка за актуалност на обобщението.')
  }
}

export const getDossierSummaryState = async (): Promise<DossierSummaryState> => {
  try {
    const summary = await getLatestDossierSummary()
    const staleness = await computeStaleness(summary)
    return { summary, staleness }
  } catch (error) {
    console.error('Error in getDossierSummaryState:', error)
    throw error
  }
}

import 'server-only'
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { patientGuidelineItems } from '@/lib/db/schema'
import type { GuidelineCategory, GuidelineSource, GuidelineStatus } from './constants'
import type {
  CreateGuidelineInput,
  PatientGuidelineItemEntity,
  UpdateGuidelineInput,
} from './types'

const mapRow = (row: typeof patientGuidelineItems.$inferSelect): PatientGuidelineItemEntity => ({
  id: row.id,
  category: row.category as GuidelineCategory,
  textEl: row.textEl,
  rationaleEl: row.rationaleEl,
  source: row.source as GuidelineSource,
  status: row.status as GuidelineStatus,
  sortOrder: row.sortOrder,
  publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

export const listGuidelineItems = async (): Promise<PatientGuidelineItemEntity[]> => {
  try {
    const rows = await db
      .select()
      .from(patientGuidelineItems)
      .orderBy(asc(patientGuidelineItems.category), asc(patientGuidelineItems.sortOrder), desc(patientGuidelineItems.id))

    return rows.map(mapRow)
  } catch (error) {
    console.error('Error listing guideline items:', error)
    throw new Error('Грешка при зареждане на насоките за пациента.')
  }
}

export const createGuidelineItem = async (
  input: CreateGuidelineInput
): Promise<PatientGuidelineItemEntity> => {
  try {
    const rows = await db
      .insert(patientGuidelineItems)
      .values({
        category: input.category,
        textEl: input.textEl,
        rationaleEl: input.rationaleEl ?? null,
        source: input.source,
        status: input.status ?? 'approved',
        sortOrder: input.sortOrder ?? 0,
      })
      .returning()

    const row = rows[0]
    if (!row) throw new Error('Insert returned no rows')
    return mapRow(row)
  } catch (error) {
    console.error('Error creating guideline item:', error)
    throw new Error('Грешка при създаване на точка в насоките.')
  }
}

export const updateGuidelineItem = async (
  id: number,
  input: UpdateGuidelineInput
): Promise<PatientGuidelineItemEntity | null> => {
  try {
    const valuesToUpdate: Partial<typeof patientGuidelineItems.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (input.textEl !== undefined) {
      valuesToUpdate.textEl = input.textEl
      valuesToUpdate.publishedAt = null
    }
    if (input.status !== undefined) valuesToUpdate.status = input.status
    if (input.category !== undefined) valuesToUpdate.category = input.category

    const rows = await db
      .update(patientGuidelineItems)
      .set(valuesToUpdate)
      .where(eq(patientGuidelineItems.id, id))
      .returning()

    const row = rows[0]
    return row ? mapRow(row) : null
  } catch (error) {
    console.error(`Error updating guideline item ${id}:`, error)
    throw new Error('Грешка при обновяване на точката.')
  }
}

export const deleteGuidelineItem = async (id: number): Promise<boolean> => {
  try {
    const rows = await db
      .delete(patientGuidelineItems)
      .where(eq(patientGuidelineItems.id, id))
      .returning({ id: patientGuidelineItems.id })

    return rows.length > 0
  } catch (error) {
    console.error(`Error deleting guideline item ${id}:`, error)
    throw new Error('Грешка при изтриване на точката.')
  }
}

export const replacePendingAiGuidelines = async (
  items: Array<{ category: GuidelineCategory; textEl: string; rationaleEl?: string | null }>
): Promise<PatientGuidelineItemEntity[]> => {
  try {
    const deleteQuery = db
      .delete(patientGuidelineItems)
      .where(
        and(
          eq(patientGuidelineItems.source, 'ai'),
          eq(patientGuidelineItems.status, 'pending')
        )
      )

    if (items.length > 0) {
      const insertQuery = db.insert(patientGuidelineItems).values(
        items.map((item, idx) => ({
          category: item.category,
          textEl: item.textEl,
          rationaleEl: item.rationaleEl ?? null,
          source: 'ai' as const,
          status: 'pending' as const,
          sortOrder: idx,
        }))
      )
      await db.batch([deleteQuery, insertQuery])
    } else {
      await deleteQuery
    }

    return await listGuidelineItems()
  } catch (error) {
    console.error('Error replacing pending AI guidelines:', error)
    throw new Error('Грешка при запис на предложените от AI насоки.')
  }
}

export const getApprovedGuidelineItems = async (): Promise<PatientGuidelineItemEntity[]> => {
  try {
    const rows = await db
      .select()
      .from(patientGuidelineItems)
      .where(
        and(
          eq(patientGuidelineItems.status, 'approved'),
          isNull(patientGuidelineItems.publishedAt)
        )
      )
      .orderBy(asc(patientGuidelineItems.category), asc(patientGuidelineItems.sortOrder))

    return rows.map(mapRow)
  } catch (error) {
    console.error('Error fetching approved guideline items:', error)
    throw new Error('Грешка при зареждане на одобрените насоки.')
  }
}

export const markGuidelinesAsPublished = async (ids: number[]): Promise<void> => {
  if (ids.length === 0) return
  try {
    await db
      .update(patientGuidelineItems)
      .set({ publishedAt: new Date(), updatedAt: new Date() })
      .where(inArray(patientGuidelineItems.id, ids))
  } catch (error) {
    console.error('Error marking guidelines as published:', error)
    throw new Error('Грешка при маркиране на насоките като публикувани.')
  }
}

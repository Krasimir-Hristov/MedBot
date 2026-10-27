import 'server-only'
import { asc, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { patientGuidelineItems } from '@/lib/db/schema'
import type { GuidelineCategory, GuidelineSource, GuidelineStatus } from './constants'
import type { PatientGuidelineItemEntity } from './types'

export class GuidelinePublishConflictError extends Error {
  constructor(
    message = 'Насоките са променени след генериране на прегледа. Моля, отворете прегледа отново.'
  ) {
    super(message)
    this.name = 'GuidelinePublishConflictError'
  }
}

const mapGuidelineRow = (
  row: typeof patientGuidelineItems.$inferSelect
): PatientGuidelineItemEntity => ({
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

export const getGuidelineItemsByIds = async (
  ids: number[]
): Promise<PatientGuidelineItemEntity[]> => {
  if (ids.length === 0) return []
  try {
    const rows = await db
      .select()
      .from(patientGuidelineItems)
      .where(inArray(patientGuidelineItems.id, ids))
      .orderBy(asc(patientGuidelineItems.category), asc(patientGuidelineItems.sortOrder))

    return rows.map(mapGuidelineRow)
  } catch (error) {
    console.error('Error fetching guideline items by IDs:', error)
    throw new Error('Грешка при проверка на насоките за публикуване.')
  }
}

export interface PublishCategoryGuidelineNoteInput {
  approvedItemIds: number[]
  category: GuidelineCategory
  titleBg: string
  titleEl: string
  noteBg: string
  noteEl: string
  doctorName: string
  semanticText: string
  embedding?: number[]
}

/**
 * Атомарно резервира/маркира одобрените точки по ID и създава лекарската бележка в една SQL заявка.
 * При паралелен опит или повторение връща 'already_published' без дублиране на бележката.
 */
export const publishCategoryGuidelineNote = async (
  input: PublishCategoryGuidelineNoteInput
): Promise<'published' | 'already_published'> => {
  const orderedIds = input.approvedItemIds
  const uniqueSortedIds = Array.from(new Set(orderedIds)).sort((a, b) => a - b)
  if (uniqueSortedIds.length === 0 || uniqueSortedIds.length !== orderedIds.length) {
    throw new GuidelinePublishConflictError()
  }

  const trimmedNoteEl = input.noteEl.trim()
  const sortedIdsSql = sql.join(
    uniqueSortedIds.map((id) => sql`${id}`),
    sql`, `
  )
  const orderedIdsSql = sql.join(
    orderedIds.map((id) => sql`${id}`),
    sql`, `
  )
  const vectorSql = input.embedding
    ? sql`${`[${input.embedding.join(',')}]`}::vector`
    : sql`NULL::vector`

  try {
    const result = await db.execute<{ claimed_count: number; note_id: number | null }>(sql`
      WITH eligible AS (
        SELECT id, text_el
        FROM patient_guideline_items
        WHERE id IN (${sortedIdsSql})
          AND category = ${input.category}
          AND status = 'approved'
          AND published_at IS NULL
        ORDER BY id
        FOR UPDATE
      ),
      claimed AS (
        UPDATE patient_guideline_items
        SET published_at = now(), updated_at = now()
        WHERE id IN (SELECT id FROM eligible)
          AND published_at IS NULL
          AND (SELECT count(*) FROM eligible) = ${uniqueSortedIds.length}
          AND (
            SELECT string_agg(
              '• ' || btrim(e.text_el),
              chr(10)
              ORDER BY array_position(ARRAY[${orderedIdsSql}]::int[], e.id)
            )
            FROM eligible e
            WHERE btrim(e.text_el) <> ''
          ) = ${trimmedNoteEl}
        RETURNING id
      ),
      inserted_note AS (
        INSERT INTO doctor_notes (
          category,
          title_bg,
          title_el,
          note_el,
          note_bg,
          doctor_name,
          semantic_text,
          embedding
        )
        SELECT
          ${input.category},
          ${input.titleBg},
          ${input.titleEl},
          ${input.noteEl},
          ${input.noteBg},
          ${input.doctorName},
          ${input.semanticText},
          ${vectorSql}
        WHERE (SELECT count(*) FROM claimed) = ${uniqueSortedIds.length}
        RETURNING id
      )
      SELECT
        (SELECT count(*)::int FROM claimed) AS claimed_count,
        (SELECT id FROM inserted_note) AS note_id
    `)

    const row = result.rows[0]
    if (Number(row?.claimed_count ?? 0) === uniqueSortedIds.length && row?.note_id != null) {
      return 'published'
    }
  } catch (error) {
    if (error instanceof GuidelinePublishConflictError) {
      throw error
    }
    console.error('Error atomically publishing category guideline note:', error)
    throw new Error('Грешка при публикуване на насоките за пациента.')
  }

  // Ако не са резервирани редове, проверяваме дали вече са публикувани идемпотентно
  const existingItems = await getGuidelineItemsByIds(uniqueSortedIds)
  const existingMap = new Map(existingItems.map((i) => [i.id, i]))
  if (existingMap.size !== orderedIds.length) {
    throw new GuidelinePublishConflictError()
  }

  const expectedPoints: string[] = []
  for (const id of orderedIds) {
    const item = existingMap.get(id)
    if (
      !item ||
      item.category !== input.category ||
      item.status !== 'approved' ||
      item.publishedAt === null
    ) {
      throw new GuidelinePublishConflictError()
    }
    const trimmed = item.textEl.trim()
    if (!trimmed) {
      throw new GuidelinePublishConflictError()
    }
    expectedPoints.push(`• ${trimmed}`)
  }

  if (expectedPoints.join('\n') !== trimmedNoteEl) {
    throw new GuidelinePublishConflictError()
  }

  return 'already_published'
}

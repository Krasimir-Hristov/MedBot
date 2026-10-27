import 'server-only'
import { asc, cosineDistance, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { medicalDocuments } from '@/lib/db/schema'
import type {
  CreateMedicalDocumentInput,
  DocumentBinaryData,
  DocumentClinicalMetadata,
  DocumentDetailItem,
  DocumentListItem,
  DossierSourceDocument,
  RagDocumentMatch,
  UpdateMedicalDocumentInput,
} from './types'

/**
 * Колони за списъчни заявки. Умишлено НЕ включва `file_base64`, `embedding`,
 * `extracted_text` и `semantic_text` (Egress optimization).
 */
const listColumns = {
  id: medicalDocuments.id,
  titleBg: medicalDocuments.titleBg,
  titleEl: medicalDocuments.titleEl,
  docDate: medicalDocuments.docDate,
  category: medicalDocuments.category,
  summaryEl: medicalDocuments.summaryEl,
  metadata: medicalDocuments.metadata,
  mimeType: medicalDocuments.mimeType,
  createdAt: medicalDocuments.createdAt,
  isVectorized: sql<boolean>`${medicalDocuments.embedding} IS NOT NULL`,
}

interface ListRow {
  id: number
  titleBg: string
  titleEl: string
  docDate: string
  category: string
  summaryEl: string
  metadata: Record<string, unknown> | null
  mimeType: string
  createdAt: Date
  isVectorized: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined

/**
 * Безопасно парсване на JSONB метаданните (стойностите в базата са `unknown`).
 */
const parseClinicalMetadata = (raw: unknown): DocumentClinicalMetadata => {
  const source = isRecord(raw) ? raw : {}
  return {
    hospital: toOptionalString(source.hospital),
    doctor: toOptionalString(source.doctor),
    staging: toOptionalString(source.staging),
    keyMarkers: toStringArray(source.keyMarkers),
    criticalAlerts: toStringArray(source.criticalAlerts),
    fileName: toOptionalString(source.fileName),
  }
}

const toListItem = (row: ListRow): DocumentListItem => {
  const meta = parseClinicalMetadata(row.metadata)
  return {
    id: row.id,
    titleBg: row.titleBg,
    titleEl: row.titleEl,
    docDate: row.docDate,
    category: row.category,
    summaryEl: row.summaryEl,
    keyMarkers: meta.keyMarkers,
    isVectorized: Boolean(row.isVectorized),
    mimeType: row.mimeType,
    createdAt: row.createdAt.toISOString(),
    fileName: meta.fileName,
  }
}

/**
 * Изпълнява асинхронна операция към Neon с автоматичен retry
 * при кратки мрежови прекъсвания или студен старт (cold-start) на compute ендпойнта.
 */
const withDbRetry = async <T>(operation: () => Promise<T>, maxRetries = 2, delayMs = 400): Promise<T> => {
  let attempt = 0
  while (true) {
    try {
      return await operation()
    } catch (error) {
      attempt++
      if (attempt > maxRetries) {
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
    }
  }
}

/**
 * Извлича бинарните данни и mime-type на документ по ID.
 * Оптимизирано да връща само нужните полета (без тежки вектори и текстове),
 * с цел минимален мрежов трафик (Egress optimization).
 */
export const getDocumentBinaryById = async (
  documentId: number
): Promise<DocumentBinaryData | null> => {
  try {
    const result = await withDbRetry(() =>
      db
        .select({
          id: medicalDocuments.id,
          fileBase64: medicalDocuments.fileBase64,
          mimeType: medicalDocuments.mimeType,
          titleBg: medicalDocuments.titleBg,
        })
        .from(medicalDocuments)
        .where(eq(medicalDocuments.id, documentId))
        .limit(1)
    )

    if (!result || result.length === 0) {
      return null
    }

    return result[0]
  } catch (error) {
    console.error(`Error fetching document binary with ID ${documentId}:`, error)
    throw new Error('Грешка при четене на документа от базата данни.')
  }
}

/**
 * Лек списък с всички документи (сортирани по дата на документа, после по ID).
 */
export const getDocumentsList = async (): Promise<DocumentListItem[]> => {
  try {
    const rows = await withDbRetry(() =>
      db
        .select(listColumns)
        .from(medicalDocuments)
        .orderBy(desc(medicalDocuments.docDate), desc(medicalDocuments.id))
    )

    return rows.map(toListItem)
  } catch (error) {
    console.error('Error fetching documents list:', error)
    throw new Error('Грешка при зареждане на списъка с документи.')
  }
}

/**
 * Детайли за документ (OCR текст и клинични метаданни) – без base64 и вектор.
 */
export const getDocumentDetailById = async (
  documentId: number
): Promise<DocumentDetailItem | null> => {
  try {
    const rows = await withDbRetry(() =>
      db
        .select({ ...listColumns, extractedText: medicalDocuments.extractedText })
        .from(medicalDocuments)
        .where(eq(medicalDocuments.id, documentId))
        .limit(1)
    )

    const row = rows[0]
    if (!row) {
      return null
    }

    const clinical = parseClinicalMetadata(row.metadata)
    return {
      ...toListItem(row),
      extractedText: row.extractedText,
      hospital: clinical.hospital,
      doctor: clinical.doctor,
      staging: clinical.staging,
      criticalAlerts: clinical.criticalAlerts,
    }
  } catch (error) {
    console.error(`Error fetching document detail with ID ${documentId}:`, error)
    throw new Error('Грешка при зареждане на документа.')
  }
}

export const createMedicalDocument = async (
  data: CreateMedicalDocumentInput
): Promise<DocumentListItem> => {
  try {
    const rows = await db
      .insert(medicalDocuments)
      .values({
        titleBg: data.titleBg,
        titleEl: data.titleEl,
        docDate: data.docDate,
        category: data.category,
        summaryEl: data.summaryEl,
        metadata: { ...data.metadata },
        extractedText: data.extractedText,
        semanticText: data.semanticText,
        embedding: data.embedding,
        fileBase64: data.fileBase64,
        mimeType: data.mimeType,
      })
      .returning(listColumns)

    const row = rows[0]
    if (!row) {
      throw new Error('Insert returned no rows')
    }
    return toListItem(row)
  } catch (error) {
    console.error('Error creating medical document:', error)
    throw new Error('Грешка при запис на документа в базата данни.')
  }
}

export const updateMedicalDocument = async (
  documentId: number,
  data: UpdateMedicalDocumentInput
): Promise<DocumentListItem | null> => {
  try {
    const rows = await db
      .update(medicalDocuments)
      .set({
        titleBg: data.titleBg,
        titleEl: data.titleEl,
        docDate: data.docDate,
        category: data.category,
        summaryEl: data.summaryEl,
        metadata: { ...data.metadata },
        semanticText: data.semanticText,
        embedding: data.embedding,
      })
      .where(eq(medicalDocuments.id, documentId))
      .returning(listColumns)

    const row = rows[0]
    return row ? toListItem(row) : null
  } catch (error) {
    console.error(`Error updating medical document ${documentId}:`, error)
    throw new Error('Грешка при обновяване на документа.')
  }
}

export const deleteMedicalDocument = async (documentId: number): Promise<boolean> => {
  try {
    const rows = await db
      .delete(medicalDocuments)
      .where(eq(medicalDocuments.id, documentId))
      .returning({ id: medicalDocuments.id })

    return rows.length > 0
  } catch (error) {
    console.error(`Error deleting medical document ${documentId}:`, error)
    throw new Error('Грешка при изтриване на документа.')
  }
}

/**
 * Проверява дали вече съществува документ със същото име на файл (или идентично заглавие).
 */
export const checkDocumentExistsByFileName = async (fileName: string): Promise<boolean> => {
  try {
    const trimmed = fileName.trim().toLowerCase()
    if (!trimmed) {
      return false
    }

    const rows = await withDbRetry(() =>
      db
        .select({ id: medicalDocuments.id })
        .from(medicalDocuments)
        .where(
          sql`lower(${medicalDocuments.metadata}->>'fileName') = ${trimmed} OR lower(${medicalDocuments.titleBg}) = ${trimmed} OR lower(${medicalDocuments.titleEl}) = ${trimmed}`
        )
        .limit(1)
    )

    return rows.length > 0
  } catch (error) {
    console.error('Error checking document existence by fileName:', error)
    return false
  }
}

/**
 * Векторно търсене по HNSW косинусно разстояние.
 * Egress-optimized: НЕ връща тежкия file_base64 и embedding.
 */
export const searchDocumentsByVector = async (
  queryEmbedding: number[],
  limit = 12
): Promise<RagDocumentMatch[]> => {
  try {
    const similarity = sql<number>`1 - (${cosineDistance(medicalDocuments.embedding, queryEmbedding)})`
    const rows = await db
      .select({
        id: medicalDocuments.id,
        titleBg: medicalDocuments.titleBg,
        titleEl: medicalDocuments.titleEl,
        docDate: medicalDocuments.docDate,
        category: medicalDocuments.category,
        summaryEl: medicalDocuments.summaryEl,
        extractedText: medicalDocuments.extractedText,
        metadata: medicalDocuments.metadata,
        similarity,
      })
      .from(medicalDocuments)
      .where(sql`${medicalDocuments.embedding} IS NOT NULL`)
      .orderBy(desc(similarity))
      .limit(limit)

    return rows.map((r) => ({
      id: r.id,
      titleBg: r.titleBg,
      titleEl: r.titleEl,
      docDate: r.docDate,
      category: r.category,
      summaryEl: r.summaryEl,
      extractedText: r.extractedText,
      metadata: parseClinicalMetadata(r.metadata),
      similarity: Number(r.similarity) || 0,
    }))
  } catch (error) {
    console.error('Error in searchDocumentsByVector:', error)
    throw new Error('Грешка при векторно търсене в медицинските документи.')
  }
}

/**
 * Всички документи в ХРОНОЛОГИЧЕН ред с пълния OCR текст – вход за обобщение на цялото досие.
 * Egress-optimized: умишлено НЕ връща `file_base64`, `embedding` и `semantic_text`.
 */
export const getDossierForSummary = async (): Promise<DossierSourceDocument[]> => {
  try {
    const rows = await db
      .select({
        id: medicalDocuments.id,
        titleBg: medicalDocuments.titleBg,
        titleEl: medicalDocuments.titleEl,
        docDate: medicalDocuments.docDate,
        category: medicalDocuments.category,
        summaryEl: medicalDocuments.summaryEl,
        extractedText: medicalDocuments.extractedText,
        metadata: medicalDocuments.metadata,
      })
      .from(medicalDocuments)
      .orderBy(asc(medicalDocuments.docDate), asc(medicalDocuments.id))

    return rows.map((r) => ({
      id: r.id,
      titleBg: r.titleBg,
      titleEl: r.titleEl,
      docDate: r.docDate,
      category: r.category,
      summaryEl: r.summaryEl,
      extractedText: r.extractedText,
      metadata: parseClinicalMetadata(r.metadata),
    }))
  } catch (error) {
    console.error('Error fetching dossier for summary:', error)
    throw new Error('Грешка при зареждане на досието за обобщение.')
  }
}

export { parseClinicalMetadata }

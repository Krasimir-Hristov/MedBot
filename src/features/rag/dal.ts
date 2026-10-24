import 'server-only'
import { desc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { doctorNotes, medicalDocuments } from '@/lib/db/schema'
import { createEmbedding, expandBilingualQuery } from './lib/embeddings'
import type { RagContextBundle, RagDoctorNoteMatch, RagDocumentMatch } from './types'

/**
 * Векторно търсене на релевантни сканирани документи в Neon с HNSW косинусно разстояние.
 * Оптимизирано за минимален egress (НЕ извлича `file_base64`).
 */
export const searchRelevantDocuments = async (
  embedding: number[],
  limit = 8
): Promise<RagDocumentMatch[]> => {
  try {
    const vectorStr = `[${embedding.join(',')}]`
    const rows = await db
      .select({
        id: medicalDocuments.id,
        titleBg: medicalDocuments.titleBg,
        titleEl: medicalDocuments.titleEl,
        docDate: medicalDocuments.docDate,
        category: medicalDocuments.category,
        summaryEl: medicalDocuments.summaryEl,
        metadata: medicalDocuments.metadata,
        extractedText: medicalDocuments.extractedText,
        similarity: sql<number>`1 - (${medicalDocuments.embedding} <=> ${vectorStr}::vector)`,
      })
      .from(medicalDocuments)
      .where(sql`${medicalDocuments.embedding} IS NOT NULL`)
      .orderBy(sql`${medicalDocuments.embedding} <=> ${vectorStr}::vector`)
      .limit(limit)

    if (rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        titleBg: r.titleBg,
        titleEl: r.titleEl,
        docDate: r.docDate,
        category: r.category,
        summaryEl: r.summaryEl,
        similarity: Number(r.similarity ?? 0),
        extractedText: r.extractedText,
        metadata: r.metadata,
      }))
    }

    // Резервен вариант (ако още няма векторизирани документи в базата)
    const fallbackRows = await db
      .select({
        id: medicalDocuments.id,
        titleBg: medicalDocuments.titleBg,
        titleEl: medicalDocuments.titleEl,
        docDate: medicalDocuments.docDate,
        category: medicalDocuments.category,
        summaryEl: medicalDocuments.summaryEl,
        metadata: medicalDocuments.metadata,
        extractedText: medicalDocuments.extractedText,
      })
      .from(medicalDocuments)
      .orderBy(desc(medicalDocuments.docDate), desc(medicalDocuments.id))
      .limit(limit)

    return fallbackRows.map((r) => ({
      id: r.id,
      titleBg: r.titleBg,
      titleEl: r.titleEl,
      docDate: r.docDate,
      category: r.category,
      summaryEl: r.summaryEl,
      similarity: 0.5,
      extractedText: r.extractedText,
      metadata: r.metadata,
    }))
  } catch (error) {
    console.error('Error searching documents with pgvector:', error)
    return []
  }
}

/**
 * Векторно търсене на релевантни лекарски препоръки в Neon.
 * Оптимизирано за минимален egress (НЕ извлича `attachment_base64`).
 */
export const searchRelevantDoctorNotes = async (
  embedding: number[],
  limit = 6
): Promise<RagDoctorNoteMatch[]> => {
  try {
    const vectorStr = `[${embedding.join(',')}]`
    const rows = await db
      .select({
        id: doctorNotes.id,
        category: doctorNotes.category,
        titleBg: doctorNotes.titleBg,
        titleEl: doctorNotes.titleEl,
        noteBg: doctorNotes.noteBg,
        noteEl: doctorNotes.noteEl,
        doctorName: doctorNotes.doctorName,
        attachmentName: doctorNotes.attachmentName,
        attachmentMime: doctorNotes.attachmentMime,
        hasAttachment: sql<boolean>`${doctorNotes.attachmentBase64} IS NOT NULL`,
        similarity: sql<number>`1 - (${doctorNotes.embedding} <=> ${vectorStr}::vector)`,
        createdAt: doctorNotes.createdAt,
      })
      .from(doctorNotes)
      .where(sql`${doctorNotes.embedding} IS NOT NULL`)
      .orderBy(sql`${doctorNotes.embedding} <=> ${vectorStr}::vector`)
      .limit(limit)

    return rows.map((r) => ({
      id: r.id,
      category: r.category,
      titleBg: r.titleBg,
      titleEl: r.titleEl,
      noteBg: r.noteBg,
      noteEl: r.noteEl,
      doctorName: r.doctorName,
      attachmentName: r.attachmentName,
      attachmentMime: r.attachmentMime,
      hasAttachment: Boolean(r.hasAttachment),
      similarity: Number(r.similarity ?? 0),
      createdAt: r.createdAt.toISOString(),
    }))
  } catch (error) {
    console.error('Error searching doctor notes with pgvector:', error)
    return []
  }
}

/**
 * Извлича последните лекарски бележки хронологично (за да ги има винаги в системния контекст)
 */
export const getRecentDoctorNotes = async (limit = 4): Promise<RagDoctorNoteMatch[]> => {
  try {
    const rows = await db
      .select({
        id: doctorNotes.id,
        category: doctorNotes.category,
        titleBg: doctorNotes.titleBg,
        titleEl: doctorNotes.titleEl,
        noteBg: doctorNotes.noteBg,
        noteEl: doctorNotes.noteEl,
        doctorName: doctorNotes.doctorName,
        attachmentName: doctorNotes.attachmentName,
        attachmentMime: doctorNotes.attachmentMime,
        hasAttachment: sql<boolean>`${doctorNotes.attachmentBase64} IS NOT NULL`,
        createdAt: doctorNotes.createdAt,
      })
      .from(doctorNotes)
      .orderBy(desc(doctorNotes.createdAt))
      .limit(limit)

    return rows.map((r) => ({
      id: r.id,
      category: r.category,
      titleBg: r.titleBg,
      titleEl: r.titleEl,
      noteBg: r.noteBg,
      noteEl: r.noteEl,
      doctorName: r.doctorName,
      attachmentName: r.attachmentName,
      attachmentMime: r.attachmentMime,
      hasAttachment: Boolean(r.hasAttachment),
      similarity: 1.0,
      createdAt: r.createdAt.toISOString(),
    }))
  } catch (error) {
    console.error('Error fetching recent doctor notes:', error)
    return []
  }
}

/**
 * Главен вход за извличане на пълен RAG контекстен пакет за даден въпрос
 */
export const getRagContextBundle = async (userQuestion: string): Promise<RagContextBundle> => {
  const expandedQuery = await expandBilingualQuery(userQuestion)
  const embedding = await createEmbedding(expandedQuery)

  const [matchedNotes, matchedDocuments, recentDoctorNotes] = await Promise.all([
    searchRelevantDoctorNotes(embedding, 5),
    searchRelevantDocuments(embedding, 6),
    getRecentDoctorNotes(3),
  ])

  return {
    matchedNotes,
    matchedDocuments,
    recentDoctorNotes,
    expandedQuery,
  }
}

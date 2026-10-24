import 'server-only'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { doctorNotes } from '@/lib/db/schema'
import type { NoteCategory } from './constants'
import type { CreateDoctorNoteInput, DoctorNoteAttachmentBinary, DoctorNoteItem } from './types'

const noteListColumns = {
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
}

/**
 * Записва нова лекарска препоръка в Neon базата данни
 */
export const createDoctorNote = async (input: CreateDoctorNoteInput): Promise<DoctorNoteItem> => {
  try {
    const rows = await db
      .insert(doctorNotes)
      .values({
        category: input.category,
        titleBg: input.titleBg,
        titleEl: input.titleEl,
        noteBg: input.noteBg,
        noteEl: input.noteEl,
        doctorName: input.doctorName || 'Д-р Специалист',
        attachmentBase64: input.attachmentBase64,
        attachmentMime: input.attachmentMime,
        attachmentName: input.attachmentName,
        extractedText: input.extractedText,
        semanticText: input.semanticText,
        embedding: input.embedding,
      })
      .returning(noteListColumns)

    const row = rows[0]
    if (!row) throw new Error('Неуспешен запис на бележката.')

    return {
      id: row.id,
      category: row.category as NoteCategory,
      titleBg: row.titleBg,
      titleEl: row.titleEl,
      noteBg: row.noteBg,
      noteEl: row.noteEl,
      doctorName: row.doctorName,
      attachmentName: row.attachmentName,
      attachmentMime: row.attachmentMime,
      hasAttachment: Boolean(row.hasAttachment),
      createdAt: row.createdAt.toISOString(),
    }
  } catch (error) {
    console.error('Error inserting doctor note:', error)
    throw new Error('Грешка при запис на лекарската препоръка в базата данни.')
  }
}

/**
 * Връща пълен списък с бележки, сортирани по най-нови първо (без големите бинарни данни)
 */
export const getDoctorNotesList = async (limit = 50): Promise<DoctorNoteItem[]> => {
  try {
    const rows = await db
      .select(noteListColumns)
      .from(doctorNotes)
      .orderBy(desc(doctorNotes.createdAt))
      .limit(limit)

    return rows.map((r) => ({
      id: r.id,
      category: r.category as NoteCategory,
      titleBg: r.titleBg,
      titleEl: r.titleEl,
      noteBg: r.noteBg,
      noteEl: r.noteEl,
      doctorName: r.doctorName,
      attachmentName: r.attachmentName,
      attachmentMime: r.attachmentMime,
      hasAttachment: Boolean(r.hasAttachment),
      createdAt: r.createdAt.toISOString(),
    }))
  } catch (error) {
    console.error('Error fetching doctor notes list:', error)
    return []
  }
}

/**
 * Извлича бинарните данни на прикачен файл по ID на бележката (за /api/notes/[id]/file)
 */
export const getDoctorNoteAttachmentById = async (
  noteId: number
): Promise<DoctorNoteAttachmentBinary | null> => {
  try {
    const rows = await db
      .select({
        id: doctorNotes.id,
        attachmentBase64: doctorNotes.attachmentBase64,
        attachmentMime: doctorNotes.attachmentMime,
        attachmentName: doctorNotes.attachmentName,
      })
      .from(doctorNotes)
      .where(eq(doctorNotes.id, noteId))
      .limit(1)

    const row = rows[0]
    if (!row || !row.attachmentBase64 || !row.attachmentMime) {
      return null
    }

    return {
      id: row.id,
      attachmentBase64: row.attachmentBase64,
      attachmentMime: row.attachmentMime,
      attachmentName: row.attachmentName,
    }
  } catch (error) {
    console.error(`Error fetching note attachment ${noteId}:`, error)
    return null
  }
}

/**
 * Изтрива лекарска бележка по ID
 */
export const deleteDoctorNote = async (noteId: number): Promise<boolean> => {
  try {
    const rows = await db
      .delete(doctorNotes)
      .where(eq(doctorNotes.id, noteId))
      .returning({ id: doctorNotes.id })

    return rows.length > 0
  } catch (error) {
    console.error(`Error deleting doctor note ${noteId}:`, error)
    throw new Error('Грешка при изтриване на бележката.')
  }
}

/**
 * Връща последната препоръка за всяка категория (Хранене, Гимнастика, Терапия, Обща)
 */
export const getLatestDoctorNotesByCategory = async (): Promise<
  Partial<Record<NoteCategory, DoctorNoteItem>>
> => {
  const notes = await getDoctorNotesList(30)
  const categoryMap: Partial<Record<NoteCategory, DoctorNoteItem>> = {}

  for (const note of notes) {
    if (!categoryMap[note.category]) {
      categoryMap[note.category] = note
    }
  }

  return categoryMap
}

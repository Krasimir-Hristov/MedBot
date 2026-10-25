import 'server-only'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { doctorNotes } from '@/lib/db/schema'
import type { DoctorNote } from '@/lib/db/schema'

/**
 * Връща списък с лекарски бележки с ограничен брой редове (подразбиране: 50).
 * За оптимизация на мрежовия трафик (egress), тежките колони (attachmentBase64,
 * embedding, extractedText, semanticText) се заместват с NULL.
 */
export const getDoctorNotes = async (limit = 50): Promise<DoctorNote[]> => {
  try {
    return await db
      .select({
        id: doctorNotes.id,
        category: doctorNotes.category,
        titleBg: doctorNotes.titleBg,
        titleEl: doctorNotes.titleEl,
        noteEl: doctorNotes.noteEl,
        noteBg: doctorNotes.noteBg,
        doctorName: doctorNotes.doctorName,
        attachmentBase64: sql<string | null>`NULL`.as('attachment_base64'),
        attachmentMime: doctorNotes.attachmentMime,
        attachmentName: doctorNotes.attachmentName,
        extractedText: sql<string | null>`NULL`.as('extracted_text'),
        semanticText: sql<string | null>`NULL`.as('semantic_text'),
        embedding: sql<number[] | null>`NULL`.as('embedding'),
        createdAt: doctorNotes.createdAt,
      })
      .from(doctorNotes)
      .orderBy(desc(doctorNotes.createdAt))
      .limit(limit)
  } catch (error) {
    console.error('Error fetching doctor notes:', error)
    throw new Error('Грешка при зареждане на лекарските бележки.')
  }
}

export const createDoctorNote = async (data: {
  noteEl: string
  noteBg: string
  doctorName?: string
}): Promise<DoctorNote> => {
  try {
    const rows = await db
      .insert(doctorNotes)
      .values({
        noteEl: data.noteEl,
        noteBg: data.noteBg,
        doctorName: data.doctorName || 'Д-р Специалист',
      })
      .returning()

    if (!rows[0]) {
      throw new Error('Insert note returned no rows')
    }
    return rows[0]
  } catch (error) {
    console.error('Error creating doctor note:', error)
    throw new Error('Грешка при запис на лекарска бележка.')
  }
}

export const deleteDoctorNote = async (noteId: number): Promise<boolean> => {
  try {
    const rows = await db
      .delete(doctorNotes)
      .where(eq(doctorNotes.id, noteId))
      .returning({ id: doctorNotes.id })

    return rows.length > 0
  } catch (error) {
    console.error(`Error deleting doctor note ${noteId}:`, error)
    throw new Error('Грешка при изтриване на лекарска бележка.')
  }
}

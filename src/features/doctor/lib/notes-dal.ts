import 'server-only'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { doctorNotes } from '@/lib/db/schema'
import type { DoctorNote } from '@/lib/db/schema'

export const getDoctorNotes = async (): Promise<DoctorNote[]> => {
  try {
    return await db
      .select()
      .from(doctorNotes)
      .orderBy(desc(doctorNotes.createdAt))
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

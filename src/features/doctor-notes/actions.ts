'use server'

import { revalidatePath } from 'next/cache'
import { requireRoles } from '@/features/auth/lib/role-guard'
import { CreateTextNoteSchema, type CreateTextNoteInput } from './schemas'
import { processTextNoteAI } from './lib/note-ai-pipeline'
import { createDoctorNote, deleteDoctorNote } from './dal'

export interface ActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action за публикуване на текстова/продиктувана бележка от лекаря
 */
export const createTextDoctorNoteAction = async (
  rawInput: CreateTextNoteInput
): Promise<ActionResponse> => {
  try {
    // 1. Проверка на ролята (само лекар или администратор)
    await requireRoles(['doctor', 'admin'] as const)

    // 2. Валидация на входните данни
    const parsed = CreateTextNoteSchema.safeParse(rawInput)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Невалидни данни.',
      }
    }

    const { noteText, category, doctorName } = parsed.data

    // 3. AI обработка: превод на български и гръцки + 1536d вектор
    const processed = await processTextNoteAI(noteText, category, doctorName)

    // 4. Запис в базата
    const created = await createDoctorNote(processed)

    // 5. Инвалидиране на кеша за порталите
    revalidatePath('/doctor')
    revalidatePath('/patient')

    return { success: true, data: created }
  } catch (error) {
    console.error('createTextDoctorNoteAction error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Възникна системна грешка при запазване.',
    }
  }
}

/**
 * Server Action за изтриване на лекарска бележка
 */
export const deleteDoctorNoteAction = async (noteId: number): Promise<ActionResponse> => {
  try {
    await requireRoles(['doctor', 'admin'] as const)

    if (!noteId || noteId <= 0) {
      return { success: false, error: 'Невалиден идентификатор.' }
    }

    const deleted = await deleteDoctorNote(noteId)
    if (!deleted) {
      return { success: false, error: 'Бележката не беше намерена.' }
    }

    revalidatePath('/doctor')
    revalidatePath('/patient')

    return { success: true }
  } catch (error) {
    console.error('deleteDoctorNoteAction error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Грешка при изтриване на бележката.',
    }
  }
}

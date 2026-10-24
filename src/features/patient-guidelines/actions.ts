'use server'

import { revalidatePath } from 'next/cache'
import { requireRoles } from '@/features/auth/lib/role-guard'
import {
  createGuidelineItem,
  deleteGuidelineItem,
  updateGuidelineItem,
} from './dal'
import {
  CreateManualGuidelineSchema,
  UpdateGuidelineSchema,
} from './schemas'
import type { PatientGuidelineItemEntity } from './types'

export interface ActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export const addManualGuidelineAction = async (
  rawInput: unknown
): Promise<ActionResponse<PatientGuidelineItemEntity>> => {
  try {
    await requireRoles(['doctor', 'admin'] as const)
    const parsed = CreateManualGuidelineSchema.safeParse(rawInput)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Невалидни данни.' }
    }

    const created = await createGuidelineItem({
      category: parsed.data.category,
      textEl: parsed.data.textEl,
      source: 'doctor',
      status: 'approved',
    })

    revalidatePath('/doctor')
    return { success: true, data: created }
  } catch (error) {
    console.error('addManualGuidelineAction error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Грешка при запис на точката.',
    }
  }
}

export const updateGuidelineAction = async (
  rawInput: unknown
): Promise<ActionResponse<PatientGuidelineItemEntity>> => {
  try {
    await requireRoles(['doctor', 'admin'] as const)
    const parsed = UpdateGuidelineSchema.safeParse(rawInput)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Невалидни данни.' }
    }

    const updated = await updateGuidelineItem(parsed.data.id, {
      textEl: parsed.data.textEl,
      status: parsed.data.status,
    })

    if (!updated) {
      return { success: false, error: 'Точката не беше намерена.' }
    }

    revalidatePath('/doctor')
    return { success: true, data: updated }
  } catch (error) {
    console.error('updateGuidelineAction error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Грешка при обновяване на точката.',
    }
  }
}

export const deleteGuidelineAction = async (id: number): Promise<ActionResponse> => {
  try {
    await requireRoles(['doctor', 'admin'] as const)
    if (!id || id <= 0) {
      return { success: false, error: 'Невалиден идентификатор.' }
    }

    const deleted = await deleteGuidelineItem(id)
    if (!deleted) {
      return { success: false, error: 'Точката не беше намерена.' }
    }

    revalidatePath('/doctor')
    return { success: true }
  } catch (error) {
    console.error('deleteGuidelineAction error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Грешка при изтриване на точката.',
    }
  }
}

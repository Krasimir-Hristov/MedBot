'use server'

import { revalidatePath } from 'next/cache'
import { AuthError, requireRoles } from '@/features/auth/lib/role-guard'
import {
  SessionNotFoundError,
  getOrCreateActivePatientSession,
  resetPatientChatSession,
} from './dal'

export interface ResetActionResult {
  success: boolean
  error?: string
}

/**
 * Server Action за стартиране на чист разговор за майка ви
 */
export const startNewPatientConversationAction = async (): Promise<ResetActionResult> => {
  try {
    await requireRoles(['patient', 'admin'] as const)
    const sessionId = await getOrCreateActivePatientSession()
    await resetPatientChatSession(sessionId)

    revalidatePath('/patient')
    return { success: true }
  } catch (error) {
    console.error('startNewPatientConversationAction error:', error)
    const safeError =
      error instanceof SessionNotFoundError || error instanceof AuthError
        ? error.message
        : 'Грешка при изчистване на разговора.'
    return {
      success: false,
      error: safeError,
    }
  }
}

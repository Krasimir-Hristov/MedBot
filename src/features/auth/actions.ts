'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { verifyPinAndGetRole } from './lib/pin'
import { setSessionCookie, clearSessionCookie } from './lib/session'
import { AuthResult } from './types'

const PinSchema = z.object({
  pin: z
    .string()
    .min(3, 'ПИН кодът трябва да съдържа поне 3 символа.')
    .max(20, 'ПИН кодът е твърде дълъг.')
    .regex(/^[0-9a-zA-Z]+$/, 'ПИН кодът може да съдържа само цифри и букви.'),
})

/**
 * Server Action за валидиране на ПИН код и създаване на сесия
 */
export const loginWithPinAction = async (formData: FormData): Promise<AuthResult> => {
  try {
    const rawPin = formData.get('pin')
    const parseResult = PinSchema.safeParse({ pin: rawPin })

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues[0]?.message ?? 'Невалиден ПИН код.'
      return { success: false, error: errorMessage }
    }

    const { pin } = parseResult.data

    // Забавяне от 250ms срещу автоматизирани brute-force атаки
    await new Promise((resolve) => setTimeout(resolve, 250))

    const role = verifyPinAndGetRole(pin)

    if (!role) {
      return {
        success: false,
        error: 'Грешен ПИН код за достъп. Моля, опитайте отново.',
      }
    }

    // Записване на криптираната сесия в HttpOnly бисквитка
    await setSessionCookie(role)

    const destinationMap: Record<string, string> = {
      admin: '/admin',
      doctor: '/doctor',
      patient: '/patient',
    }

    return {
      success: true,
      redirectTo: destinationMap[role] ?? '/',
    }
  } catch (error) {
    console.error('Login action error:', error)
    return {
      success: false,
      error: 'Възникна системна грешка при вход. Моля, опитайте по-късно.',
    }
  }
}

/**
 * Server Action за изход от профила
 */
export const logoutAction = async (): Promise<void> => {
  try {
    await clearSessionCookie()
  } catch (error) {
    console.error('Logout error:', error)
  }
  // redirect() се извиква извън try/catch в Next.js
  redirect('/')
}

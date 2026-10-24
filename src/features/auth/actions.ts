'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
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

// Проследяване на опитите за вход за ограничаване на brute-force атаки
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS_PER_IP = 10
const MAX_GLOBAL_ATTEMPTS = 60
const WINDOW_MS = 60 * 1000 // 1 минута

let globalAttempts = { count: 0, resetAt: Date.now() + WINDOW_MS }

/**
 * Извлича клиентския IP адрес от доверени ingress заглавки.
 * Защита от IP spoofing:
 * - Първо проверява специфични ingress хедъри (cf-connecting-ip, x-real-ip).
 * - За x-forwarded-for чете най-десния (последен) IP адрес, който се добавя от най-близкото доверено прокси,
 *   предотвратявайки подправяне на левия адрес от клиента.
 */
const getClientIp = async (): Promise<string> => {
  try {
    const headersList = await headers()

    const cfIp = headersList.get('cf-connecting-ip')
    if (cfIp) {
      return cfIp.trim()
    }

    const realIp = headersList.get('x-real-ip')
    if (realIp) {
      return realIp.trim()
    }

    const forwarded = headersList.get('x-forwarded-for')
    if (forwarded) {
      const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean)
      if (parts.length > 0) {
        return parts[parts.length - 1]
      }
    }
  } catch {
    // Fallback ако хедърите не са достъпни
  }
  return 'unknown-ip'
}

/**
 * Проверява лимитите за опити (както по отделен IP, така и глобален праг)
 */
const checkRateLimit = async (): Promise<boolean> => {
  const now = Date.now()

  // 1. Глобален праг за ограничаване на масиран brute-force с ротиращи IP-та
  if (now > globalAttempts.resetAt) {
    globalAttempts = { count: 1, resetAt: now + WINDOW_MS }
  } else {
    if (globalAttempts.count >= MAX_GLOBAL_ATTEMPTS) {
      return false
    }
    globalAttempts.count += 1
  }

  // 2. Индивидуален лимит по IP
  const ip = await getClientIp()
  const record = loginAttempts.get(ip)

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }

  if (record.count >= MAX_ATTEMPTS_PER_IP) {
    return false
  }

  record.count += 1
  return true
}

/**
 * Server Action за валидиране на ПИН код и създаване на сесия
 */
export const loginWithPinAction = async (formData: FormData): Promise<AuthResult> => {
  try {
    // 1. Проверка за rate limit
    const isAllowed = await checkRateLimit()
    if (!isAllowed) {
      return {
        success: false,
        errorCode: 'RATE_LIMITED',
        error: 'Твърде много опити за вход. Моля, изчакайте една минута.',
      }
    }

    const rawPin = formData.get('pin')
    const parseResult = PinSchema.safeParse({ pin: rawPin })

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues[0]?.message ?? 'Невалиден ПИН код.'
      return {
        success: false,
        errorCode: 'VALIDATION_ERROR',
        error: errorMessage,
      }
    }

    const { pin } = parseResult.data

    // Забавяне от 250ms срещу онлайн brute-force атаки
    await new Promise((resolve) => setTimeout(resolve, 250))

    const role = verifyPinAndGetRole(pin)

    if (!role) {
      return {
        success: false,
        errorCode: 'INVALID_PIN',
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
      errorCode: 'SERVER_ERROR',
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

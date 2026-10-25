import 'server-only'
import { headers } from 'next/headers'
import { getSession } from './session'
import type { SessionPayload, UserRole } from '../types'

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Валидира, че текущата сесия съществува и има една от позволените роли.
 * Използва се за Defense in Depth в Server Components, Actions и Route Handlers.
 */
export const requireRoles = async (allowedRoles: readonly UserRole[]): Promise<SessionPayload> => {
  const session = await getSession()
  if (!session) {
    throw new AuthError('Неоторизиран достъп. Моля, влезте в системата.', 401)
  }

  if (!allowedRoles.includes(session.role)) {
    throw new AuthError('Нямате необходимите права за това действие.', 403)
  }

  return session
}

/**
 * Валидира, че има каквато и да е автентицирана роля (patient, doctor или admin).
 */
export const requireAnyAuthenticatedRole = async (): Promise<SessionPayload> => {
  return requireRoles(['patient', 'doctor', 'admin'] as const)
}

/**
 * Лек in-memory rate limiter за AI и мултимедийни API маршрути
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export const checkScopedRateLimit = async (
  scope: string,
  limit: number,
  windowMs = 60_000,
  identity?: string
): Promise<{ allowed: boolean; remaining: number }> => {
  const headerStore = await headers()
  const forwarded = headerStore.get('x-forwarded-for')
  const clientIp = forwarded ? forwarded.split(',')[0]?.trim() || 'unknown' : 'unknown'
  const key = `${scope}:${identity ?? clientIp}`
  const now = Date.now()

  // Почистване на изтекли записи за предпазване от изтичане на памет
  for (const [k, v] of rateLimitMap) {
    if (now > v.resetAt) {
      rateLimitMap.delete(k)
    }
  }

  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  entry.count += 1
  return { allowed: true, remaining: limit - entry.count }
}

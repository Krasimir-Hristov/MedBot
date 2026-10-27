import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { SessionPayload, UserRole } from '../types'
import { getSecretKey } from './keys'

export const SESSION_COOKIE_NAME = 'medbot_session'
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60 // 7 дни

/**
 * Създава подписан JWT токен с ролята на потребителя
 */
export const createSessionToken = async (role: UserRole): Promise<string> => {
  try {
    const key = getSecretKey()
    const now = Math.floor(Date.now() / 1000)

    const jti = crypto.randomUUID()
    const token = await new SignJWT({
      role,
      createdAt: now,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setJti(jti)
      .setIssuedAt(now)
      .setExpirationTime(now + SESSION_DURATION_SECONDS)
      .sign(key)

    return token
  } catch (error) {
    console.error('Failed to create session token:', error)
    throw new Error('Грешка при генериране на сесия.')
  }
}

/**
 * Валидира JWT токен и връща payload
 */
export const verifySessionToken = async (
  token: string | undefined
): Promise<SessionPayload | null> => {
  if (!token) {
    return null
  }

  try {
    const key = getSecretKey()
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
      requiredClaims: ['exp'],
    })

    const role = payload.role as UserRole
    if (role !== 'admin' && role !== 'doctor' && role !== 'patient') {
      return null
    }

    return {
      ...payload,
      role,
      createdAt: typeof payload.createdAt === 'number' ? payload.createdAt : Date.now(),
      jti: typeof payload.jti === 'string' ? payload.jti : undefined,
    }
  } catch {
    // Невалиден или изтекъл токен
    return null
  }
}

/**
 * Записва защитена HttpOnly бисквитка за сесията
 */
export const setSessionCookie = async (role: UserRole): Promise<void> => {
  try {
    const token = await createSessionToken(role)
    const cookieStore = await cookies()

    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_SECONDS,
    })
  } catch (error) {
    console.error('Failed to set session cookie:', error)
    throw new Error('Неуспешно запазване на сесията.')
  }
}

/**
 * Взема текущата сесия от кукитата на сървъра
 */
export const getSession = async (): Promise<SessionPayload | null> => {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
    return await verifySessionToken(token)
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'digest' in error) {
      throw error
    }
    console.error('Failed to get session:', error)
    return null
  }
}

/**
 * Изтрива сесийната бисквитка (Logout)
 */
export const clearSessionCookie = async (): Promise<void> => {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE_NAME)
  } catch (error) {
    console.error('Failed to clear session cookie:', error)
  }
}

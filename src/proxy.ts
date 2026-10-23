import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SESSION_COOKIE_NAME = 'medbot_session'

// Списък с позволени x-* хедъри (всички останали x- се филтрират за сигурност)
const ALLOWED_X_HEADERS = new Set([
  'x-forwarded-for',
  'x-forwarded-proto',
  'x-forwarded-host',
  'x-real-ip',
])

const getSecretKey = (): Uint8Array => {
  const secret = process.env.SESSION_SECRET || 'medbot_fallback_secret_must_be_set_properly_32b'
  return new TextEncoder().encode(secret)
}

/**
 * Валидира ролята от JWT бисквитката директно в Proxy слоя
 */
const getRoleFromRequest = async (request: NextRequest): Promise<string | null> => {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    if (!token) {
      return null
    }

    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ['HS256'],
    })

    const role = typeof payload.role === 'string' ? payload.role : null
    return role
  } catch {
    return null
  }
}

/**
 * Next.js 16 Proxy функция (заместваща остарелия middleware.ts)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Изчистване на подозрителни хедъри (CVE-2025-29927 защита)
  const requestHeaders = new Headers(request.headers)
  const headerKeysToDelete: string[] = []

  requestHeaders.forEach((_, key) => {
    const lowerKey = key.toLowerCase()
    if (lowerKey.startsWith('x-') && !ALLOWED_X_HEADERS.has(lowerKey)) {
      headerKeysToDelete.push(key)
    }
  })

  headerKeysToDelete.forEach((key) => {
    requestHeaders.delete(key)
  })

  // 2. Проверка на сесията
  const role = await getRoleFromRequest(request)

  // Ако потребителят вече има валидна сесия и отваря началния екран с ПИН (/),
  // директно го пренасочваме към съответния му портал
  if (pathname === '/') {
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    if (role === 'doctor') {
      return NextResponse.redirect(new URL('/doctor', request.url))
    }
    if (role === 'patient') {
      return NextResponse.redirect(new URL('/patient', request.url))
    }
  }

  // 3. Защита на маршрутите за Администратор
  if (pathname.startsWith('/admin')) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 4. Защита на маршрутите за Лекар
  if (pathname.startsWith('/doctor')) {
    if (role !== 'doctor' && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 5. Защита на маршрутите за Пациент
  if (pathname.startsWith('/patient')) {
    if (role !== 'patient' && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 6. Защита на API маршрутите за документи (/api/doc/*)
  if (pathname.startsWith('/api/doc')) {
    if (!role) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп. Моля, въведете ПИН код.' },
        { status: 401 }
      )
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Прилага се за всички пътища освен:
     * - _next/static (статични файлове)
     * - _next/image (оптимизация на изображения)
     * - favicon.ico, икони и публични svg/png ресурси
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

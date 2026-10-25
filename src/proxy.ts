import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { getSecretKey } from '@/features/auth/lib/keys'

const SESSION_COOKIE_NAME = 'medbot_session'

// Списък със специфични опасни хедъри за филтриране (CVE-2025-29927 защита)
const DANGEROUS_HEADER_PREFIXES = [
  'x-middleware-subrequest',
  'x-middleware-rewrite',
  'x-middleware-next',
]

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
    // Всяка грешка (липсващ ключ, невалиден токен) се третира като липсваща сесия
    return null
  }
}

/**
 * Next.js 16 Proxy функция (заместваща остарелия middleware.ts)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Изчистване на опасни x-middleware-* хедъри (CVE-2025-29927 защита)
  const requestHeaders = new Headers(request.headers)
  const headerKeysToDelete: string[] = []

  requestHeaders.forEach((_, key) => {
    const lowerKey = key.toLowerCase()
    if (DANGEROUS_HEADER_PREFIXES.some((prefix) => lowerKey.startsWith(prefix))) {
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
  // Само лекар и администратор имат пълен достъп до сканираните оригинални документи
  if (pathname.startsWith('/api/doc')) {
    if (!role) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп. Моля, въведете ПИН код.' },
        { status: 401 }
      )
    }
    if (role !== 'admin' && role !== 'doctor') {
      return NextResponse.json(
        { error: 'Нямате права за достъп до сканираните документи.' },
        { status: 403 }
      )
    }
  }

  // 7. Защита на административните API маршрути (/api/admin/*)
  // Само администратор може да качва и управлява документи
  if (pathname.startsWith('/api/admin')) {
    if (!role) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп. Моля, въведете ПИН код.' },
        { status: 401 }
      )
    }
    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'Нямате права за административни операции.' },
        { status: 403 }
      )
    }
  }

  // 8. Защита на качване на лекарски предписания и файлове (/api/notes/upload)
  if (pathname.startsWith('/api/notes/upload')) {
    if (!role) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп. Моля, въведете ПИН код.' },
        { status: 401 }
      )
    }
    if (role !== 'doctor' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Нямате лекарски права за качване на предписания.' },
        { status: 403 }
      )
    }
  }

  // 9. Защита на лекарските бележки и прикрепени файлове (/api/notes/*)
  // Пациент, лекар и администратор имат достъп до преведените бележки и прикачените файлове за терапия
  if (pathname.startsWith('/api/notes')) {
    if (!role) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп. Моля, въведете ПИН код.' },
        { status: 401 }
      )
    }
  }

  // 10. Защита на пациентския чат (/api/chat/patient)
  if (pathname.startsWith('/api/chat/patient')) {
    if (!role) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп. Моля, въведете ПИН код.' },
        { status: 401 }
      )
    }
    if (role !== 'patient' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Нямате права за пациентския асистент.' },
        { status: 403 }
      )
    }
  }

  // 11. Защита на лекарските API маршрути (/api/doctor/* и /api/chat/doctor)
  if (pathname.startsWith('/api/doctor') || pathname.startsWith('/api/chat/doctor')) {
    if (!role) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп. Моля, въведете ПИН код.' },
        { status: 401 }
      )
    }
    if (role !== 'doctor' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Нямате лекарски права за тези операции.' },
        { status: 403 }
      )
    }
  }

  // 12. Защита на аудио транскрипция API (/api/audio/* и /api/transcribe) - достъпно за всички роли
  if (pathname.startsWith('/api/audio') || pathname.startsWith('/api/transcribe')) {
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

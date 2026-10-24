import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import {
  deletePatientChatSession,
  getPatientChatMessages,
  renamePatientChatSession,
} from '@/features/patient/dal'

interface RouteContext {
  params: Promise<{ sessionId: string }>
}

export const GET = async (
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> => {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  try {
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'patient' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const { sessionId } = await context.params
    const messages = await getPatientChatMessages(sessionId)

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching patient session messages:', error)
    return NextResponse.json(
      { error: 'Грешка при зареждане на съобщенията.' },
      { status: 500 }
    )
  }
}

export const PATCH = async (
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> => {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  try {
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'patient' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const { sessionId } = await context.params
    const body: unknown = await request.json()
    if (
      typeof body !== 'object' ||
      body === null ||
      !('title' in body) ||
      typeof (body as { title: unknown }).title !== 'string'
    ) {
      return NextResponse.json({ error: 'Невалидно заглавие.' }, { status: 400 })
    }

    const title = (body as { title: string }).title.trim()
    if (!title) {
      return NextResponse.json({ error: 'Заглавието не може да бъде празно.' }, { status: 400 })
    }

    const updated = await renamePatientChatSession(sessionId, title)
    return NextResponse.json({ session: updated })
  } catch (error) {
    console.error('Error renaming patient session:', error)
    return NextResponse.json(
      { error: 'Грешка при преименуване на сесията.' },
      { status: 500 }
    )
  }
}

export const DELETE = async (
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> => {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  try {
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'patient' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const { sessionId } = await context.params
    await deletePatientChatSession(sessionId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting patient session:', error)
    return NextResponse.json(
      { error: 'Грешка при изтриване на сесията.' },
      { status: 500 }
    )
  }
}

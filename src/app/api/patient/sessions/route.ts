import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import { createPatientChatSession, getPatientChatSessions } from '@/features/patient/dal'

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  try {
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'patient' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const sessions = await getPatientChatSessions()
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching patient sessions:', error)
    return NextResponse.json(
      { error: 'Грешка при зареждане на чат сесиите.' },
      { status: 500 }
    )
  }
}

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  try {
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'patient' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const body: unknown = await request.json().catch(() => ({}))
    const title =
      typeof body === 'object' && body !== null && 'title' in body && typeof (body as { title: unknown }).title === 'string'
        ? (body as { title: string }).title.trim() || 'Нов разговор'
        : 'Нов разговор'

    const newSession = await createPatientChatSession(title)
    return NextResponse.json({ session: newSession }, { status: 201 })
  } catch (error) {
    console.error('Error creating patient session:', error)
    return NextResponse.json(
      { error: 'Грешка при създаване на чат сесия.' },
      { status: 500 }
    )
  }
}

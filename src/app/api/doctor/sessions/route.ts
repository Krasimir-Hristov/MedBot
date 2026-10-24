import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import { createChatSession, getDoctorChatSessions } from '@/features/doctor/lib/chat-dal'

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  try {
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const sessions = await getDoctorChatSessions()
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching doctor sessions:', error)
    return NextResponse.json(
      { error: 'Грешка при зареждане на чат сесиите.' },
      { status: 500 }
    )
  }
}

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const body = await request.json()
    const title = (body.title as string | undefined)?.trim() || 'Нова консултация'
    const sessionId = crypto.randomUUID()

    const newSession = await createChatSession(sessionId, title, 'doctor')
    return NextResponse.json({ session: newSession }, { status: 201 })
  } catch (error) {
    console.error('Error creating doctor session:', error)
    return NextResponse.json(
      { error: 'Грешка при създаване на чат сесия.' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/features/auth/lib/session'
import {
  deleteChatSession,
  getChatMessages,
  updateChatSessionTitle,
} from '@/features/doctor/lib/chat-dal'

interface RouteContext {
  params: Promise<{
    sessionId: string
  }>
}

export const GET = async (
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> => {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const { sessionId } = await context.params
    const messages = await getChatMessages(sessionId)
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching session messages:', error)
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
  try {
    const session = await getSession()
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const { sessionId } = await context.params
    const body = await request.json()
    const title = (body.title as string | undefined)?.trim()

    if (!title) {
      return NextResponse.json(
        { error: 'Заглавието не може да бъде празно.' },
        { status: 400 }
      )
    }

    const updated = await updateChatSessionTitle(sessionId, title)
    return NextResponse.json({ session: updated })
  } catch (error) {
    console.error('Error updating session title:', error)
    return NextResponse.json(
      { error: 'Грешка при преименуване на сесията.' },
      { status: 500 }
    )
  }
}

export const DELETE = async (
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> => {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const { sessionId } = await context.params
    const deleted = await deleteChatSession(sessionId)
    return NextResponse.json({ success: deleted })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: 'Грешка при изтриване на сесията.' },
      { status: 500 }
    )
  }
}

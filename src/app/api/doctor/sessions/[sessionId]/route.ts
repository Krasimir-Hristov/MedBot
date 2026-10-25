import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
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

const PatchSessionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Заглавието не може да бъде празно.')
    .max(200, 'Заглавието е твърде дълго (макс. 200 символа).'),
})

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

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Невалиден JSON формат.' }, { status: 400 })
    }

    const parsed = PatchSessionSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Невалидно заглавие.' },
        { status: 400 }
      )
    }

    const updated = await updateChatSessionTitle(sessionId, parsed.data.title, 'doctor')
    if (!updated) {
      return NextResponse.json({ error: 'Сесията не е намерена.' }, { status: 404 })
    }

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
    const deleted = await deleteChatSession(sessionId, 'doctor')
    return NextResponse.json({ success: deleted })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: 'Грешка при изтриване на сесията.' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import {
  deletePatientChatSession,
  getPatientChatMessages,
  renamePatientChatSession,
} from '@/features/patient/dal'
import { PatientSessionUpdateSchema } from '@/features/patient/schemas'

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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Невалиден JSON формат.' }, { status: 400 })
    }

    const parsed = PatientSessionUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Невалидно заглавие.' },
        { status: 400 }
      )
    }

    try {
      const updated = await renamePatientChatSession(sessionId, parsed.data.title)
      return NextResponse.json({ session: updated })
    } catch (renameErr) {
      const msg = renameErr instanceof Error ? renameErr.message : ''
      if (msg.includes('намерена') || msg.includes('not found')) {
        return NextResponse.json({ error: 'Чат сесията не е намерена.' }, { status: 404 })
      }
      throw renameErr
    }
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
    try {
      await deletePatientChatSession(sessionId)
      return NextResponse.json({ success: true })
    } catch (deleteErr) {
      const msg = deleteErr instanceof Error ? deleteErr.message : ''
      if (msg.includes('намерена') || msg.includes('not found')) {
        return NextResponse.json({ error: 'Чат сесията не е намерена.' }, { status: 404 })
      }
      throw deleteErr
    }
  } catch (error) {
    console.error('Error deleting patient session:', error)
    return NextResponse.json(
      { error: 'Грешка при изтриване на сесията.' },
      { status: 500 }
    )
  }
}

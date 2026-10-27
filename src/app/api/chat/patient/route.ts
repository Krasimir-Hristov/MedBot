import { NextRequest, NextResponse } from 'next/server'
import { AI_MODELS, openrouter } from '@/lib/openrouter'
import { requireRoles, checkScopedRateLimit, AuthError } from '@/features/auth/lib/role-guard'
import { getRagContextBundle } from '@/features/rag'
import { PatientChatRequestSchema } from '@/features/patient/schemas'
import { buildPatientSystemPrompt } from '@/features/patient/lib/patient-prompts'
import { getPatientChatMessages, getPatientChatSessionById, savePatientChatTurn } from '@/features/patient/dal'

export const POST = async (request: NextRequest): Promise<Response> => {
  try {
    // 1. Проверка на правата (пациент или админ)
    const session = await requireRoles(['patient', 'admin'] as const)

    // 2. Rate limit
    const userIdentifier = session.jti || `${session.role}:${session.createdAt || 'session'}`
    const rateCheck = await checkScopedRateLimit('patient-chat', 25, 60_000, userIdentifier)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Твърде много въпроси за кратко време. Моля, изчакайте минута.' },
        { status: 429 }
      )
    }

    // 3. Валидация на въпроса
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Невалиден JSON формат.' }, { status: 400 })
    }

    const parsed = PatientChatRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Невалиден въпрос.' },
        { status: 400 }
      )
    }

    const { message, sessionId, locale } = parsed.data

    // 4. Проверка дали сесията съществува и принадлежи на пациент
    const sessionRecord = await getPatientChatSessionById(sessionId)
    if (!sessionRecord) {
      return NextResponse.json(
        { error: 'Чат сесията не съществува или нямате достъп до нея.' },
        { status: 404 }
      )
    }

    const cookieLocale = request.cookies.get('medbot_locale')?.value
    const effectiveLocale = (locale || (cookieLocale === 'el' ? 'el' : 'bg')) as 'bg' | 'el'

    // 5. Извличане на RAG контекст (документи + лекарски бележки)
    const ragContext = await getRagContextBundle(message)
    const systemPrompt = buildPatientSystemPrompt(ragContext, effectiveLocale)

    // 6. Зареждане на последните съобщения за плавен диалог
    const history = await getPatientChatMessages(sessionId)
    const recentHistory = history.slice(-6).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const abortController = new AbortController()
    let cleanedUp = false
    const onAbort = () => abortController.abort()
    request.signal.addEventListener('abort', onAbort)

    const cleanup = () => {
      if (cleanedUp) return
      cleanedUp = true
      request.signal.removeEventListener('abort', onAbort)
    }

    const stream = await openrouter.chat.completions.create(
      {
        model: AI_MODELS.chat,
        temperature: 0.3,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...recentHistory,
          { role: 'user', content: message },
        ],
      },
      { signal: abortController.signal }
    )

    let accumulatedText = ''
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || ''
            if (delta) {
              accumulatedText += delta
              controller.enqueue(encoder.encode(delta))
            }
          }
          cleanup()
          if (accumulatedText.trim()) {
            await savePatientChatTurn(sessionId, message, accumulatedText.trim())
          }
          controller.close()
        } catch (streamError) {
          cleanup()
          console.error('Error during patient chat stream:', streamError)
          controller.error(streamError)
        }
      },
      cancel() {
        abortController.abort()
        cleanup()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error in /api/chat/patient:', error)
    return NextResponse.json({ error: 'Възникна грешка при обработка на въпроса.' }, { status: 500 })
  }
}

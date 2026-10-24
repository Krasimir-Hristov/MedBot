import { NextRequest, NextResponse } from 'next/server'
import { AI_MODELS, openrouter } from '@/lib/openrouter'
import { requireRoles, checkScopedRateLimit } from '@/features/auth/lib/role-guard'
import { getRagContextBundle } from '@/features/rag'
import { PatientChatRequestSchema } from '@/features/patient/schemas'
import { buildPatientSystemPrompt } from '@/features/patient/lib/patient-prompts'
import { getPatientChatMessages, savePatientChatTurn } from '@/features/patient/dal'

export const POST = async (request: NextRequest): Promise<Response> => {
  try {
    // 1. Проверка на правата (пациент или админ)
    await requireRoles(['patient', 'admin'] as const)

    // 2. Rate limit
    const rateCheck = await checkScopedRateLimit('patient-chat', 25, 60_000)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Твърде много въпроси за кратко време. Моля, изчакайте минута.' },
        { status: 429 }
      )
    }

    // 3. Валидация на въпроса
    const body: unknown = await request.json()
    const parsed = PatientChatRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Невалиден въпрос.' },
        { status: 400 }
      )
    }

    const { message, sessionId, locale } = parsed.data
    const cookieLocale = request.cookies.get('medbot_locale')?.value
    const effectiveLocale = (locale || (cookieLocale === 'el' ? 'el' : 'bg')) as 'bg' | 'el'

    // 4. Извличане на RAG контекст (документи + лекарски бележки)
    const ragContext = await getRagContextBundle(message)
    const systemPrompt = buildPatientSystemPrompt(ragContext, effectiveLocale)

    // 5. Зареждане на последните съобщения за плавен диалог
    const history = await getPatientChatMessages(sessionId)
    const recentHistory = history.slice(-6).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const stream = await openrouter.chat.completions.create({
      model: AI_MODELS.chat,
      temperature: 0.3,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...recentHistory,
        { role: 'user', content: message },
      ],
    })

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
          controller.close()

          // След завършване на стрийминга записваме въпроса и отговора в базата
          if (accumulatedText.trim()) {
            await savePatientChatTurn(sessionId, message, accumulatedText.trim())
          }
        } catch (streamError) {
          console.error('Error during patient chat stream:', streamError)
          controller.error(streamError)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    })
  } catch (error) {
    console.error('Error in /api/chat/patient:', error)
    const message =
      error instanceof Error ? error.message : 'Възникна грешка при свързване с асистента.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

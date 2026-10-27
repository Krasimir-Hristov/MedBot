import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import { getDocumentsList, searchDocumentsByVector } from '@/features/documents'
import { createMedicalEmbedding } from '@/features/admin/lib/ai-pipeline'
import {
  addChatMessage,
  createChatSession,
  getChatMessages,
  getChatSession,
} from '@/features/doctor/lib/chat-dal'
import { getDoctorNotes } from '@/features/doctor/lib/notes-dal'
import {
  buildDoctorSystemPrompt,
  expandMedicalQuery,
  extractCitations,
  formatDoctorNotesIndex,
  formatDossierCatalogIndex,
  formatRetrievedMatches,
} from '@/features/doctor/lib/rag-engine'
import { AI_MODELS, openrouter } from '@/lib/openrouter'

const ChatDoctorRequestSchema = z.object({
  sessionId: z.string().trim().min(1).max(100).optional(),
  message: z
    .string()
    .trim()
    .min(1, 'Съобщението не може да бъде празно.')
    .max(4000, 'Съобщението е твърде дълго (макс. 4000 символа).'),
  locale: z.enum(['el', 'bg']).optional().default('el'),
})

export const POST = async (request: NextRequest): Promise<Response> => {
  try {
    // 1. Проверка на сесията (Defense in Depth)
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп. Изисква се лекарски профил.' },
        { status: 401 }
      )
    }

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Невалиден JSON формат.' },
        { status: 400 }
      )
    }

    const parsed = ChatDoctorRequestSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Невалидни данни за съобщението.' },
        { status: 400 }
      )
    }

    const { message: cleanMessage, locale } = parsed.data
    let activeSessionId = parsed.data.sessionId

    // Проверка на съществуваща сесия
    if (activeSessionId) {
      const existingSession = await getChatSession(activeSessionId)
      if (!existingSession || existingSession.role !== 'doctor') {
        return NextResponse.json(
          { error: 'Невалидна или несъществуваща сесия.' },
          { status: 404 }
        )
      }
    }

    // 2. Създаване на нова сесия при нужда
    if (!activeSessionId) {
      activeSessionId = crypto.randomUUID()
      const titleSnippet =
        cleanMessage.length > 35 ? `${cleanMessage.slice(0, 35)}...` : cleanMessage
      await createChatSession(activeSessionId, titleSnippet, 'doctor')
    }

    // 3. Запис на потребителското съобщение
    await addChatMessage({
      sessionId: activeSessionId,
      role: 'user',
      content: cleanMessage,
    })

    // 4. RAG Конвейер и зареждане на история на разговора + лекарски бележки
    const [expandedQuery, allDocs, existingMessages, recentNotes] = await Promise.all([
      expandMedicalQuery(cleanMessage),
      getDocumentsList(),
      getChatMessages(activeSessionId),
      getDoctorNotes().catch(() => []),
    ])

    const queryEmbedding = await createMedicalEmbedding(expandedQuery)
    const topMatches = await searchDocumentsByVector(queryEmbedding, 12)

    const catalogIndex = formatDossierCatalogIndex(allDocs, locale)
    const retrievedMatches = formatRetrievedMatches(topMatches, locale)
    const doctorNotesIndex = formatDoctorNotesIndex(recentNotes)
    const systemPrompt = buildDoctorSystemPrompt(
      locale,
      catalogIndex,
      retrievedMatches,
      doctorNotesIndex
    )

    // Извличаме предходните съобщения (без току-що записаното текущо съобщение),
    // ограничени до последните 6 съобщения за плавен контекст при последващи въпроси
    const historyMessages = existingMessages
      .slice(0, -1)
      .slice(-6)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

    // 5. Поточна заявка към DeepSeek с включен контекст от предходните реплики
    const stream = await openrouter.chat.completions.create({
      model: AI_MODELS.chat,
      temperature: 0.2,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: cleanMessage },
      ],
    })

    const encoder = new TextEncoder()
    let completeResponse = ''

    const customStream = new ReadableStream({
      async start(controller) {
        // Изпращаме началното събитие със sessionId
        const initData = JSON.stringify({ type: 'session', sessionId: activeSessionId })
        controller.enqueue(encoder.encode(`data: ${initData}\n\n`))

        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              completeResponse += content
              const chunkData = JSON.stringify({ type: 'chunk', text: content })
              controller.enqueue(encoder.encode(`data: ${chunkData}\n\n`))
            }
          }

          // Извличане на цитати и запис на отговора
          const citations = extractCitations(completeResponse)
          if (activeSessionId) {
            await addChatMessage({
              sessionId: activeSessionId,
              role: 'assistant',
              content: completeResponse,
              citations,
            })
          }

          const doneData = JSON.stringify({
            type: 'done',
            citations,
          })
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))
          controller.close()
        } catch (streamError) {
          console.error('Error during LLM streaming:', streamError)
          controller.error(streamError)
        }
      },
    })

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in /api/chat/doctor:', error)
    return NextResponse.json(
      { error: 'Възникна грешка при обработка на лекарското запитване.' },
      { status: 500 }
    )
  }
}

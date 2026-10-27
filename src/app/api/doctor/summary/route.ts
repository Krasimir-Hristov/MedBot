import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import { checkScopedRateLimit } from '@/features/auth/lib/role-guard'
import { getDossierForSummary } from '@/features/documents'
import { buildDossierContext } from '@/features/documents/lib/dossier-context'
import { getDossierSummaryState, saveDossierSummary } from '@/features/dossier-summary/dal'
import { buildSummarySystemPrompt } from '@/features/dossier-summary/lib/summary-prompt'
import { AI_MODELS, openrouter } from '@/lib/openrouter'

/** Обобщението на 40+ документа със стрийминг може да отнеме над минута. */
export const maxDuration = 300

const SUMMARY_MAX_TOKENS = 12_000

const getDoctorSession = async (request: NextRequest) => {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = await verifySessionToken(token)
  if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
    return null
  }
  return session
}

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const session = await getDoctorSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }
    const state = await getDossierSummaryState()
    return NextResponse.json(state)
  } catch (error) {
    console.error('Error in GET /api/doctor/summary:', error)
    return NextResponse.json({ error: 'Грешка при зареждане на обобщението.' }, { status: 500 })
  }
}

export const POST = async (request: NextRequest): Promise<Response> => {
  try {
    const session = await getDoctorSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const userIdentifier = session.jti || `${session.role}:${session.createdAt || 'session'}`
    const rate = await checkScopedRateLimit('dossier-summary', 3, 60_000, userIdentifier)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Твърде много заявки за обобщение. Моля, изчакайте минута.' },
        { status: 429 }
      )
    }

    const cookieLocale = request.cookies.get('medbot_locale')?.value || 'el'
    const docs = await getDossierForSummary()
    if (docs.length === 0) {
      const errorMsg =
        cookieLocale === 'bg'
          ? 'Няма качени документи в досието за обобщаване.'
          : 'Δεν υπάρχουν έγγραφα στον φάκελο για δημιουργία σύνοψης.'
      return NextResponse.json({ error: errorMsg }, { status: 400 })
    }

    const context = buildDossierContext(docs)
    const documentIds = docs.map((d) => d.id)
    const systemPrompt = buildSummarySystemPrompt(context.text, docs.length)

    if (request.signal.aborted) {
      return new Response(null, { status: 499 })
    }

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
        model: AI_MODELS.longContext,
        temperature: 0.1,
        max_tokens: SUMMARY_MAX_TOKENS,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate the complete clinical dossier summary now.' },
        ],
      },
      { signal: abortController.signal }
    )

    const encoder = new TextEncoder()
    let completeResponse = ''

    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              completeResponse += content
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: content })}\n\n`)
              )
            }
          }

          let savedSummary: Awaited<ReturnType<typeof saveDossierSummary>> | null = null
          try {
            savedSummary = await saveDossierSummary({
              contentEl: completeResponse,
              documentIds,
              truncatedDocCount: context.truncatedDocCount,
              model: AI_MODELS.longContext,
            })
          } catch (dbError) {
            console.error('Failed to save dossier summary to DB:', dbError)
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'done',
                summary: savedSummary || {
                  id: 0,
                  contentEl: completeResponse,
                  documentIds,
                  documentCount: documentIds.length,
                  truncatedDocCount: context.truncatedDocCount,
                  model: AI_MODELS.longContext,
                  createdAt: new Date().toISOString(),
                },
              })}\n\n`
            )
          )
          controller.close()
        } catch (streamError) {
          const isAbort =
            (streamError instanceof Error && streamError.name === 'AbortError') ||
            request.signal.aborted
          if (isAbort) {
            try {
              controller.close()
            } catch {
              // Ignore already closed stream
            }
            return
          }
          console.error('Error in dossier summary streaming:', streamError)
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'error',
                  message: 'Прекъсната връзка при генериране на обобщението.',
                })}\n\n`
              )
            )
            controller.close()
          } catch {
            controller.error(streamError)
          }
        } finally {
          cleanup()
        }
      },
      cancel() {
        abortController.abort()
        cleanup()
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
    console.error('Error in POST /api/doctor/summary:', error)
    return NextResponse.json({ error: 'Възникна системна грешка.' }, { status: 500 })
  }
}

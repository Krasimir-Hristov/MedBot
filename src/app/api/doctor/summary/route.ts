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

    const docs = await getDossierForSummary()
    if (docs.length === 0) {
      return NextResponse.json({ error: 'Няма документи в досието за обобщаване.' }, { status: 400 })
    }

    const context = buildDossierContext(docs)
    const documentIds = docs.map((d) => d.id)
    const systemPrompt = buildSummarySystemPrompt(context.text, docs.length)

    if (request.signal.aborted) {
      return new Response(null, { status: 499 })
    }

    const abortController = new AbortController()
    let cleanedUp = false
    const cleanup = () => {
      if (cleanedUp) return
      cleanedUp = true
      request.signal.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      abortController.abort()
      cleanup()
    }
    request.signal.addEventListener('abort', onAbort)

    if (request.signal.aborted) {
      cleanup()
      return new Response(null, { status: 499 })
    }

    const stream = await openrouter.chat.completions.create(
      {
        model: AI_MODELS.longContext,
        temperature: 0.1,
        max_tokens: SUMMARY_MAX_TOKENS,
        reasoning_effort: 'low',
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate the complete clinical dossier summary now.' },
        ],
      },
      { signal: abortController.signal }
    )

    const encoder = new TextEncoder()
    let complete = ''

    const body = new ReadableStream({
      async start(controller) {
        const send = (payload: Record<string, unknown>): void => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        }

        try {
          send({ type: 'start', documentCount: docs.length })
          let lastFinishReason: string | null = null

          for await (const chunk of stream) {
            const choice = chunk.choices[0]
            if (choice?.finish_reason) {
              lastFinishReason = choice.finish_reason
            }
            const text = choice?.delta?.content || ''
            if (text) {
              complete += text
              send({ type: 'chunk', text })
            }
          }

          const isTruncated = lastFinishReason === 'length' || lastFinishReason === 'content_filter'
          const isCompleted = lastFinishReason === 'stop'
          if (!isCompleted || complete.trim().length < 200 || isTruncated) {
            console.warn(
              'Summary output incomplete, too short, or truncated:',
              complete.trim(),
              'finishReason:',
              lastFinishReason
            )
            send({
              type: 'error',
              message: isTruncated
                ? 'Обобщението беше прекъснато заради надвишен лимит на токените. Моля, опитайте отново.'
                : 'Моделът върна непълно обобщение. Моля, опитайте отново с бутона за преглед.',
            })
            cleanup()
            controller.close()
            return
          }

          const saved = await saveDossierSummary({
            contentEl: complete,
            documentIds,
            truncatedDocCount: context.truncatedDocCount,
            model: AI_MODELS.longContext,
          })
          send({ type: 'done', summary: saved })
          cleanup()
          controller.close()
        } catch (streamError) {
          console.error('Error during summary streaming:', streamError)
          send({ type: 'error', message: 'Грешка при генериране на обобщението. Опитайте отново.' })
          cleanup()
          controller.close()
        }
      },
      cancel() {
        abortController.abort()
        cleanup()
      },
    })

    return new Response(body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in POST /api/doctor/summary:', error)
    return NextResponse.json(
      { error: 'Възникна грешка при генериране на обобщението.' },
      { status: 500 }
    )
  }
}

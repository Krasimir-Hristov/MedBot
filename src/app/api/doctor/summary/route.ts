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

const isDoctorSession = async (request: NextRequest): Promise<boolean> => {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = await verifySessionToken(token)
  return Boolean(session && (session.role === 'doctor' || session.role === 'admin'))
}

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  try {
    if (!(await isDoctorSession(request))) {
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
    if (!(await isDoctorSession(request))) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const rate = await checkScopedRateLimit('dossier-summary', 3)
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

    const stream = await openrouter.chat.completions.create({
      model: AI_MODELS.longContext,
      temperature: 0.1,
      max_tokens: SUMMARY_MAX_TOKENS,
      reasoning_effort: 'low',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the complete clinical dossier summary now.' },
      ],
    })

    const encoder = new TextEncoder()
    let complete = ''

    const body = new ReadableStream({
      async start(controller) {
        const send = (payload: Record<string, unknown>): void => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        }

        try {
          send({ type: 'start', documentCount: docs.length })
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || ''
            if (text) {
              complete += text
              send({ type: 'chunk', text })
            }
          }

          if (complete.trim().length < 200) {
            console.warn('Summary output too short or truncated:', complete.trim())
            send({
              type: 'error',
              message: 'Моделът върна непълно обобщение. Моля, опитайте отново с бутона за преглед.',
            })
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
          controller.close()
        } catch (streamError) {
          console.error('Error during summary streaming:', streamError)
          send({ type: 'error', message: 'Грешка при генериране на обобщението. Опитайте отново.' })
          controller.close()
        }
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

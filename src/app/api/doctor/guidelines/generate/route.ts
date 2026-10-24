import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import { checkScopedRateLimit } from '@/features/auth/lib/role-guard'
import { getLatestDossierSummary } from '@/features/dossier-summary/dal'
import { getDocumentsList } from '@/features/documents'
import { formatDossierCatalogIndex } from '@/features/doctor/lib/rag-engine'
import { getDoctorNotesList } from '@/features/doctor-notes/dal'
import { replacePendingAiGuidelines } from '@/features/patient-guidelines/dal'
import { buildGenerateGuidelinesPrompt } from '@/features/patient-guidelines/lib/guidelines-prompt'
import { AiGuidelinesResponseSchema } from '@/features/patient-guidelines/schemas'
import { AI_MODELS, openrouter } from '@/lib/openrouter'

export const maxDuration = 120

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const rate = await checkScopedRateLimit('guidelines-gen', 5)
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Твърде много заявки. Моля, изчакайте.' }, { status: 429 })
    }

    // 1. Gather context: latest summary, or fallback to catalog overview
    const [latestSummary, recentNotes] = await Promise.all([
      getLatestDossierSummary(),
      getDoctorNotesList(10),
    ])

    let clinicalContext = ''
    if (latestSummary?.contentEl) {
      clinicalContext = `LATEST CLINICAL DOSSIER SUMMARY:\n${latestSummary.contentEl}`
    } else {
      const allDocs = await getDocumentsList()
      clinicalContext = `ALL DOCUMENTS OVERVIEW:\n${formatDossierCatalogIndex(allDocs, 'el')}`
    }

    const notesContext = recentNotes
      .map((n) => `[${n.category}] ${n.titleEl || n.titleBg}: ${n.noteEl}`)
      .join('\n')

    const prompt = buildGenerateGuidelinesPrompt(clinicalContext, notesContext)

    // 2. Query LLM
    const completion = await openrouter.chat.completions.create({
      model: AI_MODELS.chat,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    })

    const rawContent = completion.choices[0]?.message?.content || '{}'
    let json: unknown
    try {
      json = JSON.parse(rawContent)
    } catch {
      return NextResponse.json({ error: 'Невалиден формат на отговора от AI.' }, { status: 502 })
    }

    const parsed = AiGuidelinesResponseSchema.safeParse(json)
    if (!parsed.success) {
      console.error('Guidelines generation validation failed:', parsed.error.issues)
      return NextResponse.json({ error: 'AI моделът върна некоректни данни.' }, { status: 502 })
    }

    // 3. Replace only pending AI items in database
    const mappedItems = parsed.data.items.map((i) => ({
      category: i.category,
      textEl: i.text_el,
      rationaleEl: i.rationale_el ?? null,
    }))

    const updatedList = await replacePendingAiGuidelines(mappedItems)

    return NextResponse.json({ items: updatedList })
  } catch (error) {
    console.error('Error in /api/doctor/guidelines/generate:', error)
    return NextResponse.json(
      { error: 'Възникна грешка при генериране на насоки за пациента.' },
      { status: 500 }
    )
  }
}

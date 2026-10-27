import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import { checkScopedRateLimit } from '@/features/auth/lib/role-guard'
import { getApprovedGuidelineItems } from '@/features/patient-guidelines/dal'
import { PublishGuidelinesSchema } from '@/features/patient-guidelines/schemas'
import { publishGuidelinesToPatient } from '@/features/patient-guidelines/lib/publish-pipeline'

export const maxDuration = 120

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const userIdentifier = session.jti || `${session.role}:${session.createdAt || 'session'}`
    const rateCheck = await checkScopedRateLimit('guidelines-publish', 10, 60_000, userIdentifier)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Твърде много заявки за публикуване. Моля, изчакайте минута.' },
        { status: 429 }
      )
    }

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Невалиден или липсващ JSON формат.' }, { status: 400 })
    }

    const parsed = PublishGuidelinesSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Невалидни данни за публикуване.' },
        { status: 400 }
      )
    }

    // Consistency check: ensure current approved items in DB match payload
    const currentApproved = await getApprovedGuidelineItems()
    const currentApprovedMap = new Map(currentApproved.map((i) => [i.id, i]))
    const currentApprovedIds = new Set(currentApproved.map((i) => i.id))
    const payloadIds = new Set(parsed.data.items.flatMap((i) => i.approvedItemIds))

    // If there is any discrepancy in set size or items, flag 409 stale conflict
    let hasMismatch = currentApprovedIds.size !== payloadIds.size
    if (!hasMismatch) {
      for (const id of payloadIds) {
        if (!currentApprovedIds.has(id)) {
          hasMismatch = true
          break
        }
      }
    }

    if (!hasMismatch) {
      // Content check: verify noteEl matches concatenation of current textEl
      for (const catItem of parsed.data.items) {
        const expectedNoteEl = catItem.approvedItemIds
          .map((id) => currentApprovedMap.get(id)?.textEl?.trim())
          .filter(Boolean)
          .map((text) => `• ${text}`)
          .join('\n')
        if (catItem.noteEl.trim() !== expectedNoteEl) {
          hasMismatch = true
          break
        }
      }
    }

    if (hasMismatch) {
      return NextResponse.json(
        {
          error:
            'Насоките са променени след генериране на прегледа. Моля, отворете прегледа отново.',
        },
        { status: 409 }
      )
    }

    await publishGuidelinesToPatient(
      parsed.data.items,
      parsed.data.doctorName || 'Д-р Специалист'
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in /api/doctor/guidelines/publish:', error)
    return NextResponse.json(
      { error: 'Възникна грешка при публикуване на насоките.' },
      { status: 500 }
    )
  }
}

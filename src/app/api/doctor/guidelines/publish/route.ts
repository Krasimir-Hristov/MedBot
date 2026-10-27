import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import { checkScopedRateLimit } from '@/features/auth/lib/role-guard'
import {
  GuidelinePublishConflictError,
  getApprovedGuidelineItems,
  getGuidelineItemsByIds,
} from '@/features/patient-guidelines/dal'
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

    // Consistency check: ensure payload IDs appear once, belong to their category, and match DB state
    const allPayloadIds = parsed.data.items.flatMap((i) => i.approvedItemIds)
    const [currentUnpublishedApproved, referencedItems] = await Promise.all([
      getApprovedGuidelineItems(),
      getGuidelineItemsByIds(Array.from(new Set(allPayloadIds))),
    ])

    const referencedMap = new Map(referencedItems.map((i) => [i.id, i]))
    const seenIds = new Set<number>()
    const seenCategories = new Set<string>()
    let hasMismatch = false

    for (const catItem of parsed.data.items) {
      if (catItem.approvedItemIds.length === 0 || seenCategories.has(catItem.category)) {
        hasMismatch = true
        break
      }
      seenCategories.add(catItem.category)

      const expectedPoints: string[] = []
      let publishedInCat = 0

      for (const id of catItem.approvedItemIds) {
        if (seenIds.has(id)) {
          hasMismatch = true
          break
        }
        seenIds.add(id)

        const approvedItem = referencedMap.get(id)
        if (
          !approvedItem ||
          approvedItem.status !== 'approved' ||
          approvedItem.category !== catItem.category
        ) {
          hasMismatch = true
          break
        }

        if (approvedItem.publishedAt !== null) {
          publishedInCat += 1
        }

        const trimmed = approvedItem.textEl.trim()
        if (!trimmed) {
          hasMismatch = true
          break
        }
        expectedPoints.push(`• ${trimmed}`)
      }

      if (hasMismatch) break

      if (publishedInCat > 0 && publishedInCat !== catItem.approvedItemIds.length) {
        hasMismatch = true
        break
      }

      const expectedNoteEl = expectedPoints.join('\n')
      if (catItem.noteEl.trim() !== expectedNoteEl) {
        hasMismatch = true
        break
      }
    }

    if (!hasMismatch) {
      for (const unpublishedItem of currentUnpublishedApproved) {
        if (!seenIds.has(unpublishedItem.id)) {
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
    if (error instanceof GuidelinePublishConflictError) {
      return NextResponse.json(
        {
          error:
            'Насоките са променени след генериране на прегледа. Моля, отворете прегледа отново.',
        },
        { status: 409 }
      )
    }
    console.error('Error in /api/doctor/guidelines/publish:', error)
    return NextResponse.json(
      { error: 'Възникна грешка при публикуване на насоките.' },
      { status: 500 }
    )
  }
}

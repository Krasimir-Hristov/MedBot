import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import { checkScopedRateLimit } from '@/features/auth/lib/role-guard'
import { getApprovedGuidelineItems } from '@/features/patient-guidelines/dal'
import { generatePublishPreview } from '@/features/patient-guidelines/lib/publish-pipeline'

export const maxDuration = 120

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const userIdentifier = session.jti || `${session.role}:${session.createdAt || 'session'}`
    const rateCheck = await checkScopedRateLimit('guidelines-preview', 10, 60_000, userIdentifier)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Твърде много заявки за предварителен преглед. Моля, изчакайте минута.' },
        { status: 429 }
      )
    }

    const approvedItems = await getApprovedGuidelineItems()
    if (approvedItems.length === 0) {
      return NextResponse.json(
        { error: 'Няма одобрени точки за изпращане на пациента.' },
        { status: 400 }
      )
    }

    const previewItems = await generatePublishPreview(approvedItems)

    return NextResponse.json({ previewItems })
  } catch (error) {
    console.error('Error in /api/doctor/guidelines/preview:', error)
    return NextResponse.json(
      { error: 'Грешка при подготовка на прегледа за пациента.' },
      { status: 500 }
    )
  }
}

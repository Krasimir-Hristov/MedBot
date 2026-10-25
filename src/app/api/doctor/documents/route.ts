import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import { getDocumentsList } from '@/features/documents'

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  try {
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const documents = await getDocumentsList()
    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Error in /api/doctor/documents:', error)
    return NextResponse.json(
      { error: 'Грешка при зареждане на списъка с документи.' },
      { status: 500 }
    )
  }
}

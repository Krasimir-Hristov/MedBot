import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import { processAndStoreDocument } from '@/features/documents/lib/ai-processor'

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const body = await request.json()
    const { fileBase64, mimeType, fileName, autoCreatePatientNote } = body as {
      fileBase64?: string
      mimeType?: string
      fileName?: string
      autoCreatePatientNote?: boolean
    }

    if (!fileBase64 || !mimeType) {
      return NextResponse.json(
        { error: 'Липсват файл или MIME тип на документа.' },
        { status: 400 }
      )
    }

    const result = await processAndStoreDocument({
      fileBase64,
      mimeType,
      fileName,
      uploadedByRole: 'doctor',
      autoCreatePatientNote: autoCreatePatientNote ?? true,
    })

    return NextResponse.json({
      success: true,
      document: result.document,
      patientNoteCreated: result.patientNoteCreated,
      patientNoteId: result.patientNoteId,
    })
  } catch (error) {
    console.error('Error in /api/doctor/upload:', error)
    return NextResponse.json(
      { error: 'Възникна грешка при качване и семантичен анализ на документа.' },
      { status: 500 }
    )
  }
}

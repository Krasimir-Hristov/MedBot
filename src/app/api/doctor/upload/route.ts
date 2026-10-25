import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import { processAndStoreDocument } from '@/features/documents/lib/ai-processor'

export const maxDuration = 120

const UploadSchema = z.object({
  fileBase64: z.string().min(50, 'Липсват файлови данни.').max(7_000_000, 'Файлът надвишава допустимия размер.'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  fileName: z.string().optional(),
  autoCreatePatientNote: z.boolean().optional(),
})

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Невалиден JSON формат.' }, { status: 400 })
    }

    const parsed = UploadSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Невалидни данни за качване.' },
        { status: 400 }
      )
    }

    const { fileBase64, mimeType, fileName, autoCreatePatientNote } = parsed.data

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

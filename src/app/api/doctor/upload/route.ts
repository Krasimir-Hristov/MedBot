import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import { processAndStoreDocument } from '@/features/documents/lib/ai-processor'
import { readBoundedJson, PayloadTooLargeError } from '@/lib/http-payload'

export const maxDuration = 120

const UploadSchema = z.object({
  fileBase64: z.string().min(50, 'Липсват файлови данни.').max(7_000_000, 'Файлът надвишава допустимия размер.'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  fileName: z.string().optional(),
  autoCreatePatientNote: z.boolean().optional(),
})

const MAX_UPLOAD_BODY_BYTES = 10 * 1024 * 1024 // 10 MB

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    // Поточно прочитане с лимит на реално получените байтове (DoS защита)
    let rawBody: unknown
    try {
      rawBody = await readBoundedJson(request, MAX_UPLOAD_BODY_BYTES)
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        return NextResponse.json(
          { error: 'Файлът надвишава максимално допустимия размер (макс. 5MB бинарни данни).' },
          { status: 413 }
        )
      }
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
      uploadedByRole: session.role,
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
      { error: error instanceof Error ? error.message : 'Възникна грешка при качване и семантичен анализ на документа.' },
      { status: 500 }
    )
  }
}

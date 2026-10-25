import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireRoles, AuthError } from '@/features/auth/lib/role-guard'
import { UploadPrescriptionPayloadSchema } from '@/features/doctor-notes/schemas'
import { processPrescriptionFileAI, NotePipelineError } from '@/features/doctor-notes/lib/note-ai-pipeline'
import { createDoctorNote } from '@/features/doctor-notes/dal'

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // 1. Проверка на сесията (само лекар и админ)
    await requireRoles(['doctor', 'admin'] as const)

    // 2. Проверка на размера на тялото преди JSON парсване (DoS защита)
    const contentLength = request.headers.get('content-length')
    const MAX_UPLOAD_BODY_BYTES = 8 * 1024 * 1024 // 8 MB
    if (contentLength && parseInt(contentLength, 10) > MAX_UPLOAD_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Файлът надвишава максимално допустимия размер от 5MB.' },
        { status: 413 }
      )
    }

    // 3. Валидация на тялото на заявката
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Невалиден JSON формат.' }, { status: 400 })
    }

    const parsed = UploadPrescriptionPayloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Невалидни данни за качване.' },
        { status: 400 }
      )
    }

    // 4. AI обработка на файла (Gemini OCR/PDF анализ + превод + вектор)
    const processed = await processPrescriptionFileAI(parsed.data)

    // 5. Запис в Neon
    const created = await createDoctorNote(processed)

    // 6. Обновяване на пътищата
    revalidatePath('/doctor')
    revalidatePath('/patient')

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Error in /api/notes/upload:', error)
    const status =
      error instanceof AuthError || error instanceof NotePipelineError ? error.statusCode : 500
    const message =
      error instanceof Error ? error.message : 'Възникна системна грешка при качване на предписанието.'
    return NextResponse.json({ error: message }, { status })
  }
}

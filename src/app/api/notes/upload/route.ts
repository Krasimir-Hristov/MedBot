import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireRoles } from '@/features/auth/lib/role-guard'
import { UploadPrescriptionPayloadSchema } from '@/features/doctor-notes/schemas'
import { processPrescriptionFileAI } from '@/features/doctor-notes/lib/note-ai-pipeline'
import { createDoctorNote } from '@/features/doctor-notes/dal'

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // 1. Проверка на сесията (само лекар и админ)
    await requireRoles(['doctor', 'admin'] as const)

    // 2. Валидация на тялото на заявката
    const body: unknown = await request.json()
    const parsed = UploadPrescriptionPayloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Невалидни данни за качване.' },
        { status: 400 }
      )
    }

    // 3. AI обработка на файла (Gemini OCR/PDF анализ + превод + вектор)
    const processed = await processPrescriptionFileAI(parsed.data)

    // 4. Запис в Neon
    const created = await createDoctorNote(processed)

    // 5. Обновяване на пътищата
    revalidatePath('/doctor')
    revalidatePath('/patient')

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Error in /api/notes/upload:', error)
    const message =
      error instanceof Error ? error.message : 'Възникна системна грешка при качване на предписанието.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

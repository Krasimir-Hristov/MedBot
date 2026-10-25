import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import { getDoctorNoteAttachmentById } from '@/features/doctor-notes/dal'

const ParamSchema = z.object({
  id: z.coerce.number().int().positive('Невалиден идентификатор.'),
})

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export const GET = async (
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> => {
  try {
    // 1. Проверка на сесията (достъпно за пациент, лекар и админ)
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const session = await verifySessionToken(token)
    if (!session) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    // 2. Валидация на ID параметъра
    const resolvedParams = await context.params
    const parseResult = ParamSchema.safeParse(resolvedParams)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Невалиден идентификатор.' }, { status: 400 })
    }

    const noteId = parseResult.data.id

    // 3. Извличане на файла от базата данни
    const fileData = await getDoctorNoteAttachmentById(noteId)
    if (!fileData || !fileData.attachmentBase64) {
      return NextResponse.json({ error: 'Прикаченият файл не е намерен.' }, { status: 404 })
    }

    // 4. Декодиране на Base64 към буфер
    const rawBase64 = fileData.attachmentBase64.includes(',')
      ? fileData.attachmentBase64.split(',')[1] ?? ''
      : fileData.attachmentBase64

    const fileBuffer = Buffer.from(rawBase64, 'base64')
    const mimeType = fileData.attachmentMime || 'application/pdf'
    const fileName = fileData.attachmentName || `prescription-${noteId}`

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.byteLength.toString(),
        'Content-Disposition': `inline; filename="prescription-${noteId}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Error serving note attachment file:', error)
    return NextResponse.json(
      { error: 'Грешка при зареждане на прикачения файл.' },
      { status: 500 }
    )
  }
}

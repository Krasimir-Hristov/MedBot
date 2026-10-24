import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import { getDocumentBinaryById } from '@/features/documents'

const ParamSchema = z.object({
  id: z.coerce.number().int().positive('Невалиден идентификатор на документ.'),
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
    // 1. Защита на ниво API Route (Defense in Depth)
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const session = await verifySessionToken(token)
    if (!session) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп. Моля, влезте с вашия ПИН код.' },
        { status: 401 }
      )
    }

    // Разрешен достъп само за администратор и лекар
    if (session.role !== 'admin' && session.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Нямате права за достъп до оригиналните медицински документи.' },
        { status: 403 }
      )
    }

    // 2. Валидация на параметъра ID
    const resolvedParams = await context.params
    const parseResult = ParamSchema.safeParse(resolvedParams)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Идентификаторът на документа трябва да бъде положително число.' },
        { status: 400 }
      )
    }

    const documentId = parseResult.data.id

    // 3. Извличане на файла от базата данни чрез DAL
    const documentData = await getDocumentBinaryById(documentId)

    if (!documentData || !documentData.fileBase64) {
      return NextResponse.json(
        { error: 'Документът не е намерен.' },
        { status: 404 }
      )
    }

    // 4. Декодиране на Base64 към бинарен буфер
    const base64Data = documentData.fileBase64.includes(',')
      ? documentData.fileBase64.split(',')[1]
      : documentData.fileBase64

    const fileBuffer = Buffer.from(base64Data, 'base64')
    const mimeType = documentData.mimeType || 'image/jpeg'
    const extension = mimeType === 'application/pdf'
      ? 'pdf'
      : mimeType === 'image/png'
      ? 'png'
      : mimeType === 'image/webp'
      ? 'webp'
      : 'jpg'

    // 5. Връщане на бинарния файл с оптимизирано кеширане
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.byteLength.toString(),
        'Content-Disposition': `inline; filename="doc-${documentId}.${extension}"`,
        'Cache-Control': 'private, max-age=86400, stale-while-revalidate=3600',
      },
    })
  } catch (error) {
    console.error('Error serving document file:', error)
    return NextResponse.json(
      { error: 'Възникна системна грешка при зареждане на документа.' },
      { status: 500 }
    )
  }
}

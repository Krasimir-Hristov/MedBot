import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { createMedicalDocument } from '@/features/documents'
import { isAdminSession } from '@/features/admin/lib/guard'
import {
  PipelineError,
  buildBilingualSemanticText,
  createMedicalEmbedding,
  extractMedicalDocumentData,
  toClinicalMetadata,
} from '@/features/admin/lib/ai-pipeline'
import { UploadPayloadSchema } from '@/features/admin/schemas'
import type { UploadApiResponse } from '@/features/admin/types'

// OCR + embedding на един документ може да отнеме десетки секунди
export const maxDuration = 60

const jsonResponse = (body: UploadApiResponse, status: number): NextResponse<UploadApiResponse> =>
  NextResponse.json(body, { status })

export const POST = async (request: NextRequest): Promise<NextResponse<UploadApiResponse>> => {
  try {
    // 1. Defense in Depth: само администратор
    if (!(await isAdminSession())) {
      return jsonResponse({ success: false, error: 'Нямате права за качване на документи.' }, 403)
    }

    // 2. Парсване и валидация на тялото
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return jsonResponse({ success: false, error: 'Невалидна заявка.' }, 400)
    }

    const parsed = UploadPayloadSchema.safeParse(rawBody)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Невалидни данни за качване.'
      return jsonResponse({ success: false, error: message }, 400)
    }

    const { fileName, fileBase64 } = parsed.data

    // 3. Мултимодален OCR + структуриран анализ
    const result = await extractMedicalDocumentData(fileBase64, fileName)
    const metadata = toClinicalMetadata(result)

    // 4. Двуезичен семантичен текст и 1536d вектор
    const semanticText = buildBilingualSemanticText({
      titleBg: result.title_bg,
      titleEl: result.title_el,
      docDate: result.doc_date,
      category: result.category,
      summaryEl: result.summary_el,
      metadata,
      extractedText: result.extracted_text,
    })
    const embedding = await createMedicalEmbedding(semanticText)

    // 5. Запис в Neon (само суровите base64 данни, без data URL префикса)
    const rawBase64 = fileBase64.slice(fileBase64.indexOf(',') + 1)
    const document = await createMedicalDocument({
      titleBg: result.title_bg,
      titleEl: result.title_el,
      docDate: result.doc_date,
      category: result.category,
      summaryEl: result.summary_el,
      metadata,
      extractedText: result.extracted_text,
      semanticText,
      embedding,
      fileBase64: rawBase64,
      mimeType: 'image/jpeg',
    })

    revalidatePath('/admin')

    return jsonResponse({ success: true, document }, 201)
  } catch (error) {
    if (error instanceof PipelineError) {
      return jsonResponse({ success: false, error: error.message }, error.status)
    }
    console.error('Admin upload route error:', error)
    return jsonResponse(
      { success: false, error: 'Възникна системна грешка при обработката на документа.' },
      500
    )
  }
}

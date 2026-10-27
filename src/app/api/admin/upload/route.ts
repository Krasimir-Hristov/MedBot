import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { checkDocumentExistsByFileName, createMedicalDocument } from '@/features/documents'
import { UPLOAD_LIMITS } from '@/features/admin/constants'
import { isAdminSession } from '@/features/admin/lib/guard'
import {
  PipelineError,
  buildBilingualSemanticText,
  createMedicalEmbedding,
  extractMedicalDocumentData,
  toClinicalMetadata,
} from '@/features/admin/lib/ai-pipeline'
import { UploadPayloadSchema, resolveUploadMimeType } from '@/features/admin/schemas'
import type { UploadApiResponse } from '@/features/admin/types'
import { PayloadTooLargeError, readBoundedJson } from '@/lib/http-payload'

// OCR (reasoning) + embedding на един документ може да отнеме до ~60s при плътен
// гръцки скан или многостраничен PDF. 120s дава реален запас пред лимита на платформата,
// а клиентската опашка ограничава паралелността до 2 едновременни заявки.
export const maxDuration = 120

const jsonResponse = (body: UploadApiResponse, status: number): NextResponse<UploadApiResponse> =>
  NextResponse.json(body, { status })

export const POST = async (request: NextRequest): Promise<NextResponse<UploadApiResponse>> => {
  try {
    // 1. Defense in Depth: само администратор
    if (!(await isAdminSession())) {
      return jsonResponse({ success: false, error: 'Нямате права за качване на документи.' }, 403)
    }

    // 2. Поточно парсване с лимит на байтовете (DoS защита) и валидация на тялото
    let rawBody: unknown
    try {
      rawBody = await readBoundedJson(request, UPLOAD_LIMITS.maxRequestBodyBytes)
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        return jsonResponse(
          { success: false, error: 'Файлът надвишава максимално допустимия размер (5 MB за PDF).' },
          413
        )
      }
      return jsonResponse({ success: false, error: 'Невалидна заявка.' }, 400)
    }

    const parsed = UploadPayloadSchema.safeParse(rawBody)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Невалидни данни за качване.'
      return jsonResponse({ success: false, error: message }, 400)
    }

    const { fileName, fileBase64 } = parsed.data

    // Проверка за вече качен файл със същото име в досието
    const isDuplicate = await checkDocumentExistsByFileName(fileName)
    if (isDuplicate) {
      return jsonResponse(
        { success: false, error: `Файл с име "${fileName}" вече е качен в досието.` },
        409
      )
    }

    const mimeType = resolveUploadMimeType(fileBase64) ?? 'image/jpeg'

    // 3. Мултимодален OCR + структуриран анализ (изображение или PDF)
    const result = await extractMedicalDocumentData(fileBase64, fileName)
    const metadata = toClinicalMetadata(result, fileName)

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
      mimeType,
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

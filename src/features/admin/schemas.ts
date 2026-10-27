import { z } from 'zod'
import { DOCUMENT_CATEGORIES, UPLOAD_LIMITS } from './constants'
import { normalizeCategory, normalizeDate } from './lib/normalize'

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const JPEG_DATA_URL_PREFIX = 'data:image/jpeg;base64,'
const PDF_DATA_URL_PREFIX = 'data:application/pdf;base64,'
const BASE64_BODY_REGEX = /^[A-Za-z0-9+/]+={0,2}$/

export type SupportedStoredMimeType = 'image/jpeg' | 'application/pdf'

export const resolveUploadMimeType = (dataUrl: string): SupportedStoredMimeType | null => {
  if (dataUrl.startsWith(JPEG_DATA_URL_PREFIX)) {
    return 'image/jpeg'
  }
  if (dataUrl.startsWith(PDF_DATA_URL_PREFIX)) {
    return 'application/pdf'
  }
  return null
}

const hasValidPdfMagicBytes = (base64Body: string): boolean => {
  try {
    // 1400 base64 знака са кратни на 4 и декодират първите 1050 байта (> 1024 байта по PDF стандарта).
    const headerSlice = base64Body.slice(0, 1400)
    return atob(headerSlice).includes('%PDF-')
  } catch {
    return false
  }
}

const isoDateSchema = z
  .string()
  .transform(normalizeDate)
  .pipe(z.string().regex(ISO_DATE_REGEX, 'Невалидна дата (очакван формат YYYY-MM-DD).'))

const markersSchema = z
  .array(z.string().trim().min(1).max(80))
  .max(20)

/**
 * Тяло на заявката към `/api/admin/upload`.
 * Клиентът изпраща компресиран JPEG (за снимки, вкл. `.jfif`) или оригинален PDF като data URL.
 */
export const UploadPayloadSchema = z
  .object({
    fileName: z.string().trim().min(1).max(200),
    fileBase64: z
      .string()
      .max(
        UPLOAD_LIMITS.maxPdfBase64Chars,
        'Файлът надвишава максимално допустимия размер (5 MB за PDF).'
      ),
  })
  .refine((data) => resolveUploadMimeType(data.fileBase64) !== null, {
    message: 'Очаква се компресирано JPEG изображение или PDF документ.',
    path: ['fileBase64'],
  })
  .refine(
    (data) =>
      !data.fileBase64.startsWith(JPEG_DATA_URL_PREFIX) ||
      data.fileBase64.length <= UPLOAD_LIMITS.maxBase64Chars,
    {
      message: 'Файлът е твърде голям след компресия.',
      path: ['fileBase64'],
    }
  )
  .refine(
    (data) => {
      const mimeType = resolveUploadMimeType(data.fileBase64)
      if (!mimeType) {
        return false
      }
      const prefixLength =
        mimeType === 'application/pdf' ? PDF_DATA_URL_PREFIX.length : JPEG_DATA_URL_PREFIX.length
      const body = data.fileBase64.slice(prefixLength)
      return body.length > 0 && BASE64_BODY_REGEX.test(body)
    },
    { message: 'Невалидни base64 данни.', path: ['fileBase64'] }
  )
  .refine(
    (data) =>
      !data.fileBase64.startsWith(PDF_DATA_URL_PREFIX) ||
      hasValidPdfMagicBytes(data.fileBase64.slice(PDF_DATA_URL_PREFIX.length)),
    { message: 'Невалиден или повреден PDF файл.', path: ['fileBase64'] }
  )

export type UploadPayload = z.infer<typeof UploadPayloadSchema>

/**
 * Очакваният JSON от мултимодалния модел (Gemini). Допуска `null` за опционалните полета.
 */
export const VisionOcrResultSchema = z.object({
  title_bg: z.string().trim().min(1).max(300),
  title_el: z.string().trim().min(1).max(300),
  doc_date: isoDateSchema,
  category: z.string().transform(normalizeCategory).pipe(z.enum(DOCUMENT_CATEGORIES)),
  summary_el: z.string().trim().min(1).max(3000),
  key_markers: markersSchema.nullish().transform((value) => value ?? []),
  staging: z.string().trim().max(200).nullish(),
  hospital: z.string().trim().max(200).nullish(),
  doctor: z.string().trim().max(200).nullish(),
  critical_alerts: markersSchema.nullish().transform((value) => value ?? []),
  extracted_text: z.string().trim().min(1),
})

export type VisionOcrResult = z.infer<typeof VisionOcrResultSchema>

export const UpdateDocumentSchema = z.object({
  id: z.coerce.number().int().positive(),
  titleBg: z.string().trim().min(1, 'Въведете заглавие на български.').max(300),
  titleEl: z.string().trim().min(1, 'Въведете заглавие на гръцки.').max(300),
  docDate: z.string().regex(ISO_DATE_REGEX, 'Невалидна дата.'),
  category: z.enum(DOCUMENT_CATEGORIES),
  summaryEl: z.string().trim().min(1, 'Въведете резюме.').max(3000),
  keyMarkers: markersSchema,
})

export type UpdateDocumentInput = z.infer<typeof UpdateDocumentSchema>

export const DocumentIdSchema = z.coerce.number().int().positive()

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
    const safeLen = Math.floor(Math.min(base64Body.length, 2048) / 4) * 4
    if (safeLen === 0) return true
    const headerSlice = base64Body.slice(0, safeLen)
    const decoded = Buffer.from(headerSlice, 'base64').toString('latin1')
    return decoded.includes('%PDF-') || base64Body.startsWith('JVBERi')
  } catch {
    return true
  }
}

const isoDateSchema = z
  .string()
  .nullish()
  .transform((val) => {
    if (!val || val === 'null' || val === 'undefined') {
      return new Date().toISOString().slice(0, 10)
    }
    const normalized = normalizeDate(val)
    return ISO_DATE_REGEX.test(normalized) ? normalized : new Date().toISOString().slice(0, 10)
  })

const markersSchema = z
  .array(z.string().trim().min(1).max(200))
  .max(30)

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
        'Файлът надвишава максимално допустимия размер (10 MB за PDF).'
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
 * Очакваният JSON от мултимодалния модел (Gemini).
 * Устойчив на различни форматирания, null стойности и по-дълги медицински описания.
 */
export const VisionOcrResultSchema = z
  .object({
    title_bg: z
      .string()
      .nullish()
      .transform((val) => val?.trim() || ''),
    title_el: z
      .string()
      .nullish()
      .transform((val) => val?.trim() || ''),
    doc_date: isoDateSchema,
    category: z
      .string()
      .nullish()
      .transform((val) => normalizeCategory(val || 'Други')),
    summary_el: z
      .string()
      .nullish()
      .transform((val) => (val?.trim() || 'Δεν υπάρχει διαθέσιμη περίληψη.').slice(0, 4000)),
    key_markers: z
      .unknown()
      .nullish()
      .transform((val) => {
        if (Array.isArray(val)) {
          return val
            .map((item) =>
              typeof item === 'string'
                ? item.trim()
                : typeof item === 'object' && item !== null
                ? JSON.stringify(item)
                : String(item ?? '')
            )
            .filter((s) => s.length > 0)
            .slice(0, 30)
            .map((s) => s.slice(0, 150))
        }
        if (typeof val === 'string' && val.trim().length > 0) {
          return [val.trim().slice(0, 150)]
        }
        return []
      }),
    staging: z
      .unknown()
      .nullish()
      .transform((val) => {
        if (!val) return null
        if (typeof val === 'string') return val.trim().slice(0, 200) || null
        if (typeof val === 'object') return JSON.stringify(val).slice(0, 200)
        return String(val).slice(0, 200)
      }),
    hospital: z
      .unknown()
      .nullish()
      .transform((val) => {
        if (!val) return null
        return typeof val === 'string' ? val.trim().slice(0, 250) || null : String(val).slice(0, 250)
      }),
    doctor: z
      .unknown()
      .nullish()
      .transform((val) => {
        if (!val) return null
        return typeof val === 'string' ? val.trim().slice(0, 250) || null : String(val).slice(0, 250)
      }),
    critical_alerts: z
      .unknown()
      .nullish()
      .transform((val) => {
        if (Array.isArray(val)) {
          return val
            .map((item) =>
              typeof item === 'string'
                ? item.trim()
                : typeof item === 'object' && item !== null
                ? JSON.stringify(item)
                : String(item ?? '')
            )
            .filter((s) => s.length > 0)
            .slice(0, 20)
            .map((s) => s.slice(0, 300))
        }
        if (typeof val === 'string' && val.trim().length > 0) {
          return [val.trim().slice(0, 300)]
        }
        return []
      }),
    extracted_text: z
      .unknown()
      .nullish()
      .transform((val) => {
        if (typeof val === 'string' && val.trim().length > 0) {
          return val.trim()
        }
        return '[Няма извлечен текстов слой в документа]'
      }),
  })
  .transform((data) => {
    const titleBg = data.title_bg || data.title_el || 'Медицински документ'
    const titleEl = data.title_el || data.title_bg || 'Ιατρικό έγγραφο'
    return {
      ...data,
      title_bg: titleBg.slice(0, 300),
      title_el: titleEl.slice(0, 300),
    }
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

import { z } from 'zod'
import { DOCUMENT_CATEGORIES, UPLOAD_LIMITS } from './constants'
import { normalizeCategory, normalizeDate } from './lib/normalize'

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const JPEG_DATA_URL_PREFIX = 'data:image/jpeg;base64,'
const BASE64_BODY_REGEX = /^[A-Za-z0-9+/]+={0,2}$/

const isoDateSchema = z
  .string()
  .transform(normalizeDate)
  .pipe(z.string().regex(ISO_DATE_REGEX, 'Невалидна дата (очакван формат YYYY-MM-DD).'))

const markersSchema = z
  .array(z.string().trim().min(1).max(80))
  .max(20)

/**
 * Тяло на заявката към `/api/admin/upload`.
 * Клиентът винаги изпраща компресиран JPEG като data URL.
 */
export const UploadPayloadSchema = z
  .object({
    fileName: z.string().trim().min(1).max(200),
    fileBase64: z.string().max(UPLOAD_LIMITS.maxBase64Chars, 'Файлът е твърде голям след компресия.'),
  })
  .refine((data) => data.fileBase64.startsWith(JPEG_DATA_URL_PREFIX), {
    message: 'Очаква се компресирано JPEG изображение.',
    path: ['fileBase64'],
  })
  .refine(
    (data) => BASE64_BODY_REGEX.test(data.fileBase64.slice(JPEG_DATA_URL_PREFIX.length)),
    { message: 'Невалидни base64 данни.', path: ['fileBase64'] }
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

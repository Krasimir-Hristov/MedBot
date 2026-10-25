import { z } from 'zod'
import { MAX_ATTACHMENT_BYTES, NOTE_CATEGORIES } from './constants'

const MAX_ATTACHMENT_BASE64_CHARS = Math.ceil((MAX_ATTACHMENT_BYTES * 4) / 3) + 256

export const CreateTextNoteSchema = z.object({
  noteText: z
    .string()
    .trim()
    .min(3, 'Бележката трябва да съдържа поне 3 символа.')
    .max(5000, 'Бележката е твърде дълга (макс. 5000 символа).'),
  category: z.enum(NOTE_CATEGORIES).default('general'),
  doctorName: z.string().trim().max(100).default('Д-р Специалист'),
})

export type CreateTextNoteInput = z.infer<typeof CreateTextNoteSchema>

export const UploadPrescriptionPayloadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileBase64: z
    .string()
    .min(50, 'Липсват файлови данни.')
    .max(MAX_ATTACHMENT_BASE64_CHARS, 'Файлът надвишава лимита от 5MB.'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  category: z.enum(NOTE_CATEGORIES).default('general'),
  doctorNote: z.string().trim().max(3000).optional(),
  doctorName: z.string().trim().max(100).default('Д-р Специалист'),
})

export type UploadPrescriptionPayload = z.infer<typeof UploadPrescriptionPayloadSchema>

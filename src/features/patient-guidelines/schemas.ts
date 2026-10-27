import { z } from 'zod'
import { GUIDELINE_CATEGORIES, GUIDELINE_STATUSES } from './constants'

export const AiGuidelineItemSchema = z.object({
  category: z.enum(GUIDELINE_CATEGORIES),
  text_el: z.string().min(3),
  rationale_el: z.string().nullish().transform((v) => v ?? undefined),
})

export const AiGuidelinesResponseSchema = z.object({
  items: z.array(AiGuidelineItemSchema),
})

export type AiGuidelineItem = z.infer<typeof AiGuidelineItemSchema>

export const CreateManualGuidelineSchema = z.object({
  category: z.enum(GUIDELINE_CATEGORIES),
  textEl: z.string().min(2, 'Текстът трябва да съдържа поне 2 символа.'),
})

export const UpdateGuidelineSchema = z.object({
  id: z.number().int().positive(),
  textEl: z.string().min(2).optional(),
  status: z.enum(GUIDELINE_STATUSES).optional(),
})

export const DeleteGuidelineIdSchema = z.number().int().positive('Невалиден идентификатор.')

export const CategoryPreviewItemSchema = z.object({
  category: z.enum(GUIDELINE_CATEGORIES),
  titleBg: z.string().min(1),
  titleEl: z.string().min(1),
  noteBg: z.string().min(1),
  noteEl: z.string().min(1),
  approvedItemIds: z.array(z.number().int().positive()).min(1),
})

export const PublishGuidelinesSchema = z.object({
  items: z.array(CategoryPreviewItemSchema).min(1, 'Няма избрани категории за публикуване.'),
  doctorName: z.string().optional(),
})

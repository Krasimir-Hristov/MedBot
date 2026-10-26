import { z } from 'zod'

export const PatientChatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Моля, въведете вашия въпрос.')
    .max(2000, 'Въпросът е твърде дълъг (макс. 2000 символа).'),
  sessionId: z.string().trim().min(1).default('patient-primary-active'),
  locale: z.enum(['bg', 'el']).optional().default('bg'),
})

export type PatientChatRequest = z.infer<typeof PatientChatRequestSchema>

export const PatientSessionTitleSchema = z
  .string()
  .trim()
  .min(1, 'Заглавието не може да бъде празно.')
  .max(100, 'Заглавието не може да надвишава 100 знака.')

export const PatientSessionCreateSchema = z.object({
  title: PatientSessionTitleSchema.optional().default('Нов разговор'),
})

export const PatientSessionUpdateSchema = z.object({
  title: PatientSessionTitleSchema,
})

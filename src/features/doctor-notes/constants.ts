export const NOTE_CATEGORIES = [
  'general',
  'therapy',
  'diet',
  'exercise',
] as const

export type NoteCategory = (typeof NOTE_CATEGORIES)[number]

export const NOTE_CATEGORY_LABELS_BG: Record<NoteCategory, string> = {
  general: 'Обща препоръка',
  therapy: '💊 Терапия и лекарства',
  diet: '🥗 Хранене и диета',
  exercise: '🤸 Лечебна гимнастика',
}

export const NOTE_CATEGORY_LABELS_EL: Record<NoteCategory, string> = {
  general: 'Γενική οδηγία',
  therapy: '💊 Θεραπεία & Φάρμακα',
  diet: '🥗 Διατροφή & Δίαιτα',
  exercise: '🤸 Θεραπευτική άσκηση',
}

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10 MB

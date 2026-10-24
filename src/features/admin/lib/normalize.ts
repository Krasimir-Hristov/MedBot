import { DOCUMENT_CATEGORIES } from '../constants'
import type { DocumentCategory } from '@/features/documents'

const CATEGORY_SYNONYMS: Array<{ category: DocumentCategory; patterns: RegExp[] }> = [
  {
    category: 'Хистология',
    patterns: [/хистолог|патоанатом|биопси|histolog|patholog|biops|ιστολογ|παθολογοανατ|βιοψ/i],
  },
  {
    category: 'Образна диагностика',
    patterns: [/образн|imaging|radiolog|\bct\b|\bmri\b|\bpet\b|ултразвук|ехограф|мамограф|απεικον|αξονικ|μαγνητικ|υπερηχ/i],
  },
  {
    category: 'Туморни маркери',
    patterns: [/маркер|marker|καρκινικ|δείκτ|ca\s?15|cea\b/i],
  },
  {
    category: 'Епикризи',
    patterns: [/епикриз|изписв|epicris|discharge|εξιτήρ|γνωμάτευσ/i],
  },
  {
    category: 'Лабораторни изследвания',
    patterns: [/лаборатор|кръвн|laborat|blood|εργαστηρ|αιματολογ/i],
  },
]

/**
 * Нормализира свободния отговор на модела до една от позволените категории.
 */
export const normalizeCategory = (raw: string): DocumentCategory => {
  const trimmed = raw.trim()
  const exact = DOCUMENT_CATEGORIES.find((category) => category === trimmed)
  if (exact) {
    return exact
  }

  for (const entry of CATEGORY_SYNONYMS) {
    if (entry.patterns.some((pattern) => pattern.test(trimmed))) {
      return entry.category
    }
  }
  return 'Други'
}

/**
 * Нормализира дата към ISO формат `YYYY-MM-DD`.
 * Поддържа `DD.MM.YYYY`, `DD/MM/YYYY`, `DD-MM-YYYY` и `YYYY-MM-DD`. При неуспех връща оригиналния низ.
 */
export const normalizeDate = (raw: string): string => {
  const value = raw.trim()

  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(value)
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  }

  const european = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(value)
  if (european) {
    return `${european[3]}-${european[2].padStart(2, '0')}-${european[1].padStart(2, '0')}`
  }

  return value
}

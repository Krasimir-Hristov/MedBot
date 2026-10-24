import type { DocumentCategory } from '@/features/documents'

export const DOCUMENT_CATEGORIES = [
  'Хистология',
  'Образна диагностика',
  'Туморни маркери',
  'Епикризи',
  'Лабораторни изследвания',
  'Други',
] as const satisfies readonly DocumentCategory[]

export type CategoryKey =
  | 'histology'
  | 'imaging'
  | 'markers'
  | 'epicrisis'
  | 'laboratory'
  | 'other'

const CATEGORY_KEY_MAP: Record<string, CategoryKey> = {
  'Хистология': 'histology',
  'Образна диагностика': 'imaging',
  'Туморни маркери': 'markers',
  'Епикризи': 'epicrisis',
  'Лабораторни изследвания': 'laboratory',
  'Други': 'other',
}

export const getCategoryKey = (category: string): CategoryKey =>
  CATEGORY_KEY_MAP[category] ?? 'other'

/** Цветови семантики за категориите (Clinical Light Mode). */
export const CATEGORY_BADGE_STYLES: Record<CategoryKey, string> = {
  histology: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  imaging: 'bg-sky-50 border-sky-200 text-sky-700',
  markers: 'bg-rose-50 border-rose-200 text-rose-700',
  epicrisis: 'bg-teal-50 border-teal-200 text-teal-800',
  laboratory: 'bg-amber-50 border-amber-200 text-amber-800',
  other: 'bg-slate-100 border-slate-200 text-slate-600',
}

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const UPLOAD_LIMITS = {
  maxFiles: 30,
  maxFileBytes: 25 * 1024 * 1024,
  maxConcurrent: 2,
  /** Максимален размер на base64 низа след компресия (~1MB бинарни данни). */
  maxBase64Chars: 1_400_000,
} as const

export const DOCUMENTS_PAGE_SIZE = 8

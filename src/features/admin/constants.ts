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

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jfif',
  'image/pjpeg',
  'image/png',
  'image/webp',
] as const

export const ACCEPTED_DOCUMENT_TYPES = ['application/pdf'] as const

export const ACCEPTED_UPLOAD_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.jfif',
  '.png',
  '.webp',
  '.pdf',
] as const

/** Стойност за атрибута `accept` на `<input type="file">`, включваща и разширения за Windows (.jfif, .pdf). */
export const ACCEPTED_FILE_INPUT = [
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_DOCUMENT_TYPES,
  ...ACCEPTED_UPLOAD_EXTENSIONS,
].join(',')

export type UploadFileKind = 'image' | 'pdf'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.jfif', '.png', '.webp'] as const

const getFileExtension = (fileName: string): string => {
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex >= 0 ? fileName.slice(dotIndex).trim().toLowerCase() : ''
}

/**
 * Определя дали избраният файл е поддържано изображение (вкл. `.jfif` под Windows с празен
 * или нестандартен MIME тип) или PDF документ.
 */
export const classifyUploadFile = (file: {
  name: string
  type: string
}): UploadFileKind | null => {
  const mime = file.type.trim().toLowerCase()
  const ext = getFileExtension(file.name)

  if (
    mime === 'application/pdf' ||
    ((mime === '' || mime === 'application/octet-stream') && ext === '.pdf')
  ) {
    return 'pdf'
  }

  if ((ACCEPTED_IMAGE_TYPES as readonly string[]).includes(mime)) {
    return 'image'
  }

  if (
    ext === '.jfif' &&
    (mime === '' ||
      mime === 'application/octet-stream' ||
      mime.includes('jfif') ||
      mime.includes('jpeg'))
  ) {
    return 'image'
  }

  if (
    (mime === '' || mime === 'application/octet-stream') &&
    (IMAGE_EXTENSIONS as readonly string[]).includes(ext)
  ) {
    return 'image'
  }

  return null
}

export const UPLOAD_LIMITS = {
  maxFiles: 30,
  /** Максимален размер на сурово изображение преди клиентска компресия (25 MB). */
  maxFileBytes: 25 * 1024 * 1024,
  /** Максимален размер на PDF файл (5 MB бинарни данни – запазва се без загуба на качество). */
  maxPdfBytes: 5 * 1024 * 1024,
  maxConcurrent: 2,
  /** Максимален размер на base64 низа след компресия за JPEG (~1MB бинарни данни). */
  maxBase64Chars: 1_400_000,
  /** Максимален размер на base64 низа за PDF (~5MB бинарни данни). */
  maxPdfBase64Chars: 7_000_000,
  /** Твърд лимит в байтове за входящо JSON тяло към `/api/admin/upload` (10 MB). */
  maxRequestBodyBytes: 10 * 1024 * 1024,
} as const

export const DOCUMENTS_PAGE_SIZE = 8

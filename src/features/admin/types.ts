import type { DocumentDetailItem, DocumentListItem } from '@/features/documents'

export type UploadStage = 'queued' | 'compressing' | 'analyzing' | 'done' | 'error'

export type UploadErrorCode =
  | 'unsupported'
  | 'too_large'
  | 'too_large_pdf'
  | 'too_many'
  | 'compress'
  | 'network'
  | 'server'

export interface UploadQueueItem {
  id: string
  fileName: string
  originalSize: number
  compressedSize?: number
  stage: UploadStage
  /** Реален прогрес само за компресията (0-100). */
  progress: number
  errorCode?: UploadErrorCode
  /** Съобщение от сървъра (вече е user-friendly) */
  errorMessage?: string
  documentId?: number
}

export type UploadApiResponse =
  | { success: true; document: DocumentListItem }
  | { success: false; error: string }

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export type DocumentDetailResult = ActionResult<DocumentDetailItem>
export type DocumentMutationResult = ActionResult<DocumentListItem>
export type ShareLinkResult = ActionResult<{ text: string }>

/**
 * Type guard за отговора на `/api/admin/upload` (никога не се доверяваме на `unknown` JSON).
 */
export const isUploadApiResponse = (value: unknown): value is UploadApiResponse => {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  if (record.success === true) {
    return typeof record.document === 'object' && record.document !== null
  }
  return record.success === false && typeof record.error === 'string'
}

export interface DocumentBinaryData {
  id: number
  fileBase64: string
  mimeType: string
  titleBg: string
}

export type DocumentCategory =
  | 'Хистология'
  | 'Образна диагностика'
  | 'Туморни маркери'
  | 'Епикризи'
  | 'Лабораторни изследвания'
  | 'Други'

/**
 * Структурирани клинични параметри, съхранявани в JSONB колоната `metadata`.
 */
export interface DocumentClinicalMetadata {
  hospital?: string
  doctor?: string
  staging?: string
  keyMarkers: string[]
  criticalAlerts: string[]
}

/**
 * Лек обект за списъци и таблици (без base64, вектор и пълен OCR текст).
 * `category` е string, тъй като в базата може да има и по-стари/свободни стойности.
 */
export interface DocumentListItem {
  id: number
  titleBg: string
  titleEl: string
  docDate: string
  category: string
  summaryEl: string
  keyMarkers: string[]
  isVectorized: boolean
  mimeType: string
  createdAt: string
}

export type DocumentCatalogItem = DocumentListItem

export interface RagDocumentMatch {
  id: number
  titleBg: string
  titleEl: string
  docDate: string
  category: string
  summaryEl: string
  extractedText: string
  metadata: DocumentClinicalMetadata
  similarity: number
}

/** Пълен документ (с OCR текст, без base64 и вектор) за обобщение на цялото досие. */
export interface DossierSourceDocument {
  id: number
  titleBg: string
  titleEl: string
  docDate: string
  category: string
  summaryEl: string
  extractedText: string
  metadata: DocumentClinicalMetadata
}

export interface AiExtractedDocumentData {
  titleBg: string
  titleEl: string
  docDate: string
  category: DocumentCategory
  summaryEl: string
  patientSummaryBg: string
  isPrescriptionOrGuidance: boolean
  extractedText: string
  metadata: DocumentClinicalMetadata
}

export interface IngestDocumentInput {
  fileBase64: string
  mimeType: string
  fileName?: string
  uploadedByRole: 'doctor' | 'admin'
  autoCreatePatientNote?: boolean
}

export interface IngestDocumentResult {
  document: DocumentCatalogItem
  patientNoteCreated: boolean
  patientNoteId?: number
}

export interface DocumentDetailItem extends DocumentListItem {
  extractedText: string
  hospital?: string
  doctor?: string
  staging?: string
  criticalAlerts: string[]
}

export interface CreateMedicalDocumentInput {
  titleBg: string
  titleEl: string
  docDate: string
  category: DocumentCategory
  summaryEl: string
  metadata: DocumentClinicalMetadata
  extractedText: string
  semanticText: string
  embedding: number[]
  fileBase64: string
  mimeType: string
}

export interface UpdateMedicalDocumentInput {
  titleBg: string
  titleEl: string
  docDate: string
  category: DocumentCategory
  summaryEl: string
  metadata: DocumentClinicalMetadata
  semanticText: string
  embedding: number[]
}

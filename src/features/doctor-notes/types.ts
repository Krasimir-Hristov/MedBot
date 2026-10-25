import type { NoteCategory } from './constants'

export interface DoctorNoteItem {
  id: number
  category: NoteCategory
  titleBg: string | null
  titleEl: string | null
  noteBg: string
  noteEl: string
  doctorName: string | null
  attachmentName: string | null
  attachmentMime: string | null
  hasAttachment: boolean
  createdAt: string
}

export interface DoctorNoteAttachmentBinary {
  id: number
  attachmentBase64: string
  attachmentMime: string
  attachmentName: string | null
}

export interface CreateDoctorNoteInput {
  category: NoteCategory
  titleBg?: string
  titleEl?: string
  noteBg: string
  noteEl: string
  doctorName?: string
  attachmentBase64?: string
  attachmentMime?: string
  attachmentName?: string
  extractedText?: string
  semanticText?: string
  embedding?: number[]
}

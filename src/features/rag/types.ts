export interface RagDocumentMatch {
  id: number
  titleBg: string
  titleEl: string
  docDate: string
  category: string
  summaryEl: string
  similarity: number
  extractedText: string
  metadata?: Record<string, unknown> | null
}

export interface RagDoctorNoteMatch {
  id: number
  category: string
  titleBg: string | null
  titleEl: string | null
  noteBg: string
  noteEl: string
  doctorName: string | null
  attachmentName: string | null
  attachmentMime: string | null
  hasAttachment: boolean
  similarity: number
  createdAt: string
}

export interface RagContextBundle {
  matchedNotes: RagDoctorNoteMatch[]
  matchedDocuments: RagDocumentMatch[]
  recentDoctorNotes: RagDoctorNoteMatch[]
  expandedQuery?: string
}

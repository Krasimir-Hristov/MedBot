import type { DoctorNoteItem } from '@/features/doctor-notes'
import type { ChatSession } from '@/lib/db/schema'

export interface PatientChatMessage {
  id?: number
  role: 'user' | 'assistant'
  content: string
  citations?: Array<{ id: number; title: string }>
  createdAt?: string
}

export interface PatientPortalData {
  latestNote: DoctorNoteItem | null
  notesByCategory: {
    diet?: DoctorNoteItem
    exercise?: DoctorNoteItem
    therapy?: DoctorNoteItem
    general?: DoctorNoteItem
  }
  stats: {
    totalDocuments: number
    latestDocumentDate?: string
  }
  activeSessionId: string
  sessions: ChatSession[]
  messages: PatientChatMessage[]
}


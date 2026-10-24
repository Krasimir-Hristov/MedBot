import { NOTE_CATEGORIES, type NoteCategory } from '@/features/doctor-notes/constants'

export const GUIDELINE_CATEGORIES = NOTE_CATEGORIES
export type GuidelineCategory = NoteCategory

export const GUIDELINE_STATUSES = ['pending', 'approved', 'rejected'] as const
export type GuidelineStatus = (typeof GUIDELINE_STATUSES)[number]

export const GUIDELINE_SOURCES = ['ai', 'doctor'] as const
export type GuidelineSource = (typeof GUIDELINE_SOURCES)[number]

import type { GuidelineCategory, GuidelineSource, GuidelineStatus } from './constants'

export interface PatientGuidelineItemEntity {
  id: number
  category: GuidelineCategory
  textEl: string
  rationaleEl: string | null
  source: GuidelineSource
  status: GuidelineStatus
  sortOrder: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateGuidelineInput {
  category: GuidelineCategory
  textEl: string
  rationaleEl?: string | null
  source?: GuidelineSource
  status?: GuidelineStatus
  sortOrder?: number
}

export interface UpdateGuidelineInput {
  textEl?: string
  status?: GuidelineStatus
  category?: GuidelineCategory
}

export interface CategoryPreviewItem {
  category: GuidelineCategory
  titleBg: string
  titleEl: string
  noteBg: string
  noteEl: string
  approvedItemIds: number[]
}

export interface PublishGuidelinesPayload {
  items: CategoryPreviewItem[]
  doctorName?: string
}

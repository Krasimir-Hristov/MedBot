import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { verifySessionToken } from '@/features/auth/lib/session'
import { checkScopedRateLimit } from '@/features/auth/lib/role-guard'
import {
  getApprovedGuidelineItems,
  getGuidelineItemsByIds,
} from '@/features/patient-guidelines/dal'
import { publishGuidelinesToPatient } from '@/features/patient-guidelines/lib/publish-pipeline'
import type { PatientGuidelineItemEntity } from '@/features/patient-guidelines/types'

vi.mock('@/lib/db', () => ({
  db: {},
}))

vi.mock('@/features/auth/lib/session', () => ({
  SESSION_COOKIE_NAME: 'medbot_session',
  verifySessionToken: vi.fn(),
}))

vi.mock('@/features/auth/lib/role-guard', () => ({
  checkScopedRateLimit: vi.fn(),
}))

vi.mock('@/features/patient-guidelines/dal', async () => {
  const actual = await vi.importActual<typeof import('@/features/patient-guidelines/publish-dal')>(
    '@/features/patient-guidelines/publish-dal'
  )
  return {
    GuidelinePublishConflictError: actual.GuidelinePublishConflictError,
    getApprovedGuidelineItems: vi.fn(),
    getGuidelineItemsByIds: vi.fn(),
  }
})

vi.mock('@/features/patient-guidelines/lib/publish-pipeline', () => ({
  publishGuidelinesToPatient: vi.fn(),
}))

const makeRequest = (body: unknown): NextRequest =>
  new NextRequest('http://localhost:3000/api/doctor/guidelines/publish', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: 'medbot_session=valid-token',
    },
    body: JSON.stringify(body),
  })

const dbItem = (overrides: Partial<PatientGuidelineItemEntity>): PatientGuidelineItemEntity => ({
  id: 1,
  category: 'diet',
  textEl: 'Πίνετε νερό.',
  rationaleEl: null,
  source: 'ai',
  status: 'approved',
  sortOrder: 0,
  publishedAt: null,
  createdAt: '2024-06-01T10:00:00.000Z',
  updatedAt: '2024-06-01T10:00:00.000Z',
  ...overrides,
})

describe('POST /api/doctor/guidelines/publish - Consistency & Category Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifySessionToken).mockResolvedValue({ role: 'doctor', createdAt: Date.now() })
    vi.mocked(checkScopedRateLimit).mockResolvedValue({ allowed: true, remaining: 9 })
  })

  it('rejects duplicate approvedItemIds across preview items with 409', async () => {
    const item1 = dbItem({ id: 1, category: 'diet', textEl: 'Πίνετε νερό.' })
    vi.mocked(getApprovedGuidelineItems).mockResolvedValue([item1])
    vi.mocked(getGuidelineItemsByIds).mockResolvedValue([item1])

    const res = await POST(
      makeRequest({
        items: [
          {
            category: 'diet',
            titleBg: 'Хранене',
            titleEl: 'Διατροφή',
            noteBg: '• Пийте вода.\n• Пийте вода.',
            noteEl: '• Πίνετε νερό.\n• Πίνετε νερό.',
            approvedItemIds: [1, 1],
          },
        ],
      })
    )

    expect(res.status).toBe(409)
    expect(publishGuidelinesToPatient).not.toHaveBeenCalled()
  })

  it('rejects approvedItemIds placed under a foreign category with 409', async () => {
    const dietItem = dbItem({ id: 1, category: 'diet', textEl: 'Πίνετε νερό.' })
    vi.mocked(getApprovedGuidelineItems).mockResolvedValue([dietItem])
    vi.mocked(getGuidelineItemsByIds).mockResolvedValue([dietItem])

    const res = await POST(
      makeRequest({
        items: [
          {
            category: 'therapy',
            titleBg: 'Терапия',
            titleEl: 'Θεραπεία',
            noteBg: '• Пийте вода.',
            noteEl: '• Πίνετε νερό.',
            approvedItemIds: [1],
          },
        ],
      })
    )

    expect(res.status).toBe(409)
    expect(publishGuidelinesToPatient).not.toHaveBeenCalled()
  })

  it('rejects with 409 when a new unpublished approved item exists in DB missing from payload', async () => {
    const item1 = dbItem({ id: 1, category: 'diet', textEl: 'Πίνετε νερό.' })
    const item2 = dbItem({ id: 2, category: 'therapy', textEl: 'Λήψη φαρμάκου.' })
    vi.mocked(getApprovedGuidelineItems).mockResolvedValue([item1, item2])
    vi.mocked(getGuidelineItemsByIds).mockResolvedValue([item1])

    const res = await POST(
      makeRequest({
        items: [
          {
            category: 'diet',
            titleBg: 'Хранене',
            titleEl: 'Διατροφή',
            noteBg: '• Пийте вода.',
            noteEl: '• Πίνετε νερό.',
            approvedItemIds: [1],
          },
        ],
      })
    )

    expect(res.status).toBe(409)
    expect(publishGuidelinesToPatient).not.toHaveBeenCalled()
  })

  it('accepts valid payload and calls publishGuidelinesToPatient with 200', async () => {
    const item1 = dbItem({ id: 1, category: 'diet', textEl: 'Πίνετε νερό.' })
    vi.mocked(getApprovedGuidelineItems).mockResolvedValue([item1])
    vi.mocked(getGuidelineItemsByIds).mockResolvedValue([item1])
    vi.mocked(publishGuidelinesToPatient).mockResolvedValue(undefined)

    const res = await POST(
      makeRequest({
        items: [
          {
            category: 'diet',
            titleBg: 'Хранене',
            titleEl: 'Διατροφή',
            noteBg: '• Пийте вода.',
            noteEl: '• Πίνετε νερό.',
            approvedItemIds: [1],
          },
        ],
      })
    )

    expect(res.status).toBe(200)
    expect(publishGuidelinesToPatient).toHaveBeenCalledTimes(1)
  })
})

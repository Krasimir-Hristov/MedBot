import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computeStaleness } from './dal'
import { db } from '@/lib/db'
import type { DossierSummaryItem } from './types'

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  dossierSummaries: {
    createdAt: 'created_at',
  },
  medicalDocuments: {
    id: 'id',
  },
}))

const makeSummary = (documentIds: number[]): DossierSummaryItem => ({
  id: 1,
  contentEl: 'Κλινική σύνοψη φακέλου...',
  documentIds,
  documentCount: documentIds.length,
  truncatedDocCount: 0,
  model: 'google/gemini-3.8-flash',
  createdAt: '2024-06-01T12:00:00.000Z',
})

describe('Dossier Summary DAL - Staleness Computation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns zero counts immediately when summary is null', async () => {
    const result = await computeStaleness(null)
    expect(result).toEqual({ newCount: 0, removedCount: 0 })
    expect(db.select).not.toHaveBeenCalled()
  })

  it('computes both added (newCount) and deleted (removedCount) documents accurately', async () => {
    // Summary had [1, 2, 3]; DB now has [2, 3, 4, 5] -> 2 new (4, 5), 1 removed (1)
    const mockFrom = vi.fn().mockResolvedValue([{ id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }])
    vi.mocked(db.select).mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof db.select>)

    const staleness = await computeStaleness(makeSummary([1, 2, 3]))
    expect(staleness).toEqual({ newCount: 2, removedCount: 1 })
  })

  it('returns zero counts when DB document IDs match summarized IDs', async () => {
    const mockFrom = vi.fn().mockResolvedValue([{ id: 10 }, { id: 20 }])
    vi.mocked(db.select).mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof db.select>)

    const staleness = await computeStaleness(makeSummary([20, 10]))
    expect(staleness).toEqual({ newCount: 0, removedCount: 0 })
  })
})

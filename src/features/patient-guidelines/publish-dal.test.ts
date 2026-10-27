import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  GuidelinePublishConflictError,
  publishCategoryGuidelineNote,
} from './publish-dal'
import { db } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  db: {
    execute: vi.fn(),
    select: vi.fn(),
  },
  patientGuidelineItems: {
    id: 'id',
    category: 'category',
    sortOrder: 'sort_order',
  },
  doctorNotes: {
    id: 'id',
  },
}))

const mockSelectItems = (rows: Array<Record<string, unknown>>): void => {
  const mockOrderBy = vi.fn().mockResolvedValue(rows)
  const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy })
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
  vi.mocked(db.select).mockReturnValue({
    from: mockFrom,
  } as unknown as ReturnType<typeof db.select>)
}

describe('Patient Guidelines - Atomic Publish & Idempotent Conflict Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GuidelinePublishConflictError', () => {
    it('is an instance of Error with name GuidelinePublishConflictError', () => {
      const err = new GuidelinePublishConflictError('Конфликт')
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe('GuidelinePublishConflictError')
      expect(err.message).toBe('Конфликт')
    })

    it('has default Bulgarian conflict message', () => {
      const err = new GuidelinePublishConflictError()
      expect(err.message).toBe(
        'Насоките са променени след генериране на прегледа. Моля, отворете прегледа отново.'
      )
    })
  })

  describe('publishCategoryGuidelineNote', () => {
    it('throws GuidelinePublishConflictError when approvedItemIds has duplicate IDs', async () => {
      await expect(
        publishCategoryGuidelineNote({
          approvedItemIds: [1, 2, 1],
          category: 'diet',
          titleBg: 'Хранене',
          titleEl: 'Διατροφή',
          noteBg: 'Пийте вода.',
          noteEl: '• Πίνετε νερό.',
          doctorName: 'Д-р Тест',
          semanticText: 'Семантичен текст',
        })
      ).rejects.toThrow(GuidelinePublishConflictError)
    })

    it('throws GuidelinePublishConflictError when approvedItemIds is empty', async () => {
      await expect(
        publishCategoryGuidelineNote({
          approvedItemIds: [],
          category: 'therapy',
          titleBg: 'Терапия',
          titleEl: 'Θεραπεία',
          noteBg: 'Бележка',
          noteEl: 'Σημείωση',
          doctorName: 'Д-р Тест',
          semanticText: 'Семантичен текст',
        })
      ).rejects.toThrow(GuidelinePublishConflictError)
    })

    it('returns "published" when atomic CTE claims rows and creates note', async () => {
      vi.mocked(db.execute).mockResolvedValue({
        rows: [{ claimed_count: 2, note_id: 101 }],
      } as unknown as Awaited<ReturnType<typeof db.execute>>)

      const result = await publishCategoryGuidelineNote({
        approvedItemIds: [10, 11],
        category: 'diet',
        titleBg: 'Хранене',
        titleEl: 'Διατροφή',
        noteBg: 'Пийте вода.',
        noteEl: '• Πίνετε νερό.\n• Αποφύγετε αλάτι.',
        doctorName: 'Д-р Тест',
        semanticText: 'Семантичен текст',
      })

      expect(result).toBe('published')
    })

    it('returns "already_published" idempotently when concurrent request already published exact items', async () => {
      const now = new Date()
      vi.mocked(db.execute).mockResolvedValue({
        rows: [{ claimed_count: 0, note_id: null }],
      } as unknown as Awaited<ReturnType<typeof db.execute>>)

      mockSelectItems([
        {
          id: 10,
          category: 'diet',
          textEl: 'Πίνετε νερό.',
          rationaleEl: null,
          source: 'ai',
          status: 'approved',
          sortOrder: 0,
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ])

      const result = await publishCategoryGuidelineNote({
        approvedItemIds: [10],
        category: 'diet',
        titleBg: 'Хранене',
        titleEl: 'Διατροφή',
        noteBg: 'Пийте вода.',
        noteEl: '• Πίνετε νερό.',
        doctorName: 'Д-р Тест',
        semanticText: 'Семантичен текст',
      })

      expect(result).toBe('already_published')
    })

    it('throws GuidelinePublishConflictError when claim returns 0 and text or status changed', async () => {
      const now = new Date()
      vi.mocked(db.execute).mockResolvedValue({
        rows: [{ claimed_count: 0, note_id: null }],
      } as unknown as Awaited<ReturnType<typeof db.execute>>)

      mockSelectItems([
        {
          id: 10,
          category: 'diet',
          textEl: 'Променен текст на гръцки.',
          rationaleEl: null,
          source: 'doctor',
          status: 'approved',
          sortOrder: 0,
          publishedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      ])

      await expect(
        publishCategoryGuidelineNote({
          approvedItemIds: [10],
          category: 'diet',
          titleBg: 'Хранене',
          titleEl: 'Διατροφή',
          noteBg: 'Пийте вода.',
          noteEl: '• Πίνετε νερό.',
          doctorName: 'Д-р Тест',
          semanticText: 'Семантичен текст',
        })
      ).rejects.toThrow(GuidelinePublishConflictError)
    })
  })
})

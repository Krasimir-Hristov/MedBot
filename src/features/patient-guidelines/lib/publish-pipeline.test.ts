import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateCategoryPreviewList, publishGuidelinesToPatient } from './publish-pipeline'
import { openrouter } from '@/lib/openrouter'
import { createEmbedding } from '@/features/rag'
import {
  GuidelinePublishConflictError,
  getGuidelineItemsByIds,
  publishCategoryGuidelineNote,
} from '../dal'
import type { PatientGuidelineItemEntity } from '../types'

vi.mock('@/lib/db', () => ({
  db: {},
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/openrouter', () => ({
  AI_MODELS: { chat: 'deepseek/deepseek-v4.1-flash' },
  openrouter: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}))

vi.mock('@/features/rag', () => ({
  createEmbedding: vi.fn(),
}))

vi.mock('../dal', async () => {
  const actual = await vi.importActual<typeof import('../publish-dal')>('../publish-dal')
  return {
    GuidelinePublishConflictError: actual.GuidelinePublishConflictError,
    getGuidelineItemsByIds: vi.fn(),
    publishCategoryGuidelineNote: vi.fn(),
  }
})

const makeItem = (overrides: Partial<PatientGuidelineItemEntity>): PatientGuidelineItemEntity => ({
  id: 1,
  category: 'diet',
  textEl: 'Πίνετε 2 λίτρα νερό.',
  rationaleEl: null,
  source: 'ai',
  status: 'approved',
  sortOrder: 0,
  publishedAt: null,
  createdAt: '2024-06-01T10:00:00.000Z',
  updatedAt: '2024-06-01T10:00:00.000Z',
  ...overrides,
})

describe('Patient Guidelines - Preview Translation Safety & Publish Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateCategoryPreviewList', () => {
    it('aborts with error when AI omits note_bg instead of leaking Greek text to patient', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(openrouter.chat.completions.create).mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ title_bg: 'Хранене', note_bg: '   ' }) } }],
      } as unknown as Awaited<ReturnType<typeof openrouter.chat.completions.create>>)

      await expect(generateCategoryPreviewList([makeItem({ id: 1 })])).rejects.toThrow(
        'Неуспешен превод на насоките на български език.'
      )
      errSpy.mockRestore()
    })

    it('groups approved items by category and produces translated Bulgarian preview', async () => {
      vi.mocked(openrouter.chat.completions.create).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title_bg: 'Насоки за хранене',
                title_el: 'Οδηγίες διατροφής',
                note_bg: '• Пийте поне 2 литра вода дневно.',
              }),
            },
          },
        ],
      } as unknown as Awaited<ReturnType<typeof openrouter.chat.completions.create>>)

      const result = await generateCategoryPreviewList([makeItem({ id: 7 })])
      expect(result).toEqual([
        {
          category: 'diet',
          titleBg: 'Насоки за хранене',
          titleEl: 'Οδηγίες διατροφής',
          noteBg: '• Пийте поне 2 литра вода дневно.',
          noteEl: '• Πίνετε 2 λίτρα νερό.',
          approvedItemIds: [7],
        },
      ])
    })
  })

  describe('publishGuidelinesToPatient', () => {
    it('skips already-published category idempotently and publishes only remaining category', async () => {
      vi.mocked(getGuidelineItemsByIds)
        .mockResolvedValueOnce([
          makeItem({ id: 1, category: 'diet', publishedAt: '2024-06-01T11:00:00.000Z' }),
        ])
        .mockResolvedValueOnce([
          makeItem({ id: 2, category: 'therapy', textEl: 'Λήψη φαρμάκου.', publishedAt: null }),
        ])
      vi.mocked(createEmbedding).mockResolvedValue([0.1, 0.2])
      vi.mocked(publishCategoryGuidelineNote).mockResolvedValue('published')

      await publishGuidelinesToPatient([
        {
          category: 'diet',
          titleBg: 'Хранене',
          titleEl: 'Διατροφή',
          noteBg: '• Пийте 2 литра вода.',
          noteEl: '• Πίνετε 2 λίτρα νερό.',
          approvedItemIds: [1],
        },
        {
          category: 'therapy',
          titleBg: 'Терапия',
          titleEl: 'Θεραπεία',
          noteBg: '• Приемайте лекарството.',
          noteEl: '• Λήψη φαρμάκου.',
          approvedItemIds: [2],
        },
      ])

      // Diet was already published -> createEmbedding & publishCategoryGuidelineNote called ONLY once (for therapy)
      expect(createEmbedding).toHaveBeenCalledTimes(1)
      expect(publishCategoryGuidelineNote).toHaveBeenCalledTimes(1)
      expect(publishCategoryGuidelineNote).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'therapy', approvedItemIds: [2] })
      )
    })

    it('rejects duplicate IDs across categories before hitting database', async () => {
      await expect(
        publishGuidelinesToPatient([
          {
            category: 'diet',
            titleBg: 'Хранене',
            titleEl: 'Διατροφή',
            noteBg: 'Текст',
            noteEl: '• Текст',
            approvedItemIds: [5],
          },
          {
            category: 'therapy',
            titleBg: 'Терапия',
            titleEl: 'Θεραπεία',
            noteBg: 'Текст',
            noteEl: '• Текст',
            approvedItemIds: [5],
          },
        ])
      ).rejects.toThrow(GuidelinePublishConflictError)

      expect(getGuidelineItemsByIds).not.toHaveBeenCalled()
    })
  })
})

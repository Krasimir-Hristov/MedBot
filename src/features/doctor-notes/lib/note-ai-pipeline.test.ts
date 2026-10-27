import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  NotePipelineError,
  parseJsonResponse,
  processPrescriptionFileAI,
  processTextNoteAI,
} from './note-ai-pipeline'
import { openrouter } from '@/lib/openrouter'
import { createEmbedding } from '@/features/rag'

vi.mock('@/lib/openrouter', () => ({
  AI_MODELS: {
    chat: 'deepseek/deepseek-v4.1-flash',
    vision: 'google/gemini-3.8-flash',
  },
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

describe('Doctor Notes AI Pipeline - Translation, Multimodal PDF/Image & Vectorization', () => {
  const originalKey = process.env.OPENROUTER_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENROUTER_API_KEY = 'sk-or-test-notes-key'
  })

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = originalKey
  })

  describe('parseJsonResponse', () => {
    it('extracts JSON wrapped in ```json fences or surrounding text', () => {
      const parsed = parseJsonResponse('Here is JSON:\n```json\n{"title_bg":"Диета"}\n```')
      expect(parsed).toEqual({ title_bg: 'Диета' })
    })

    it('throws NotePipelineError when JSON braces are missing or malformed', () => {
      expect(() => parseJsonResponse('No JSON object here')).toThrow(NotePipelineError)
      expect(() => parseJsonResponse('{broken: json}')).toThrow(NotePipelineError)
    })
  })

  describe('processTextNoteAI', () => {
    it('translates note, falls back to preferredCategory on invalid AI category, and creates embedding', async () => {
      vi.mocked(openrouter.chat.completions.create).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title_bg: 'Двигателен режим',
                title_el: 'Κινητική αγωγή',
                note_bg: 'Правете 30 минути разходка дневно.',
                note_el: 'Περπάτημα 30 λεπτών ημερησίως.',
                category: 'unknown_category',
              }),
            },
          },
        ],
      } as unknown as Awaited<ReturnType<typeof openrouter.chat.completions.create>>)
      vi.mocked(createEmbedding).mockResolvedValueOnce([0.25, 0.75])

      const result = await processTextNoteAI(
        'Περπάτημα 30 λεπτών ημερησίως.',
        'exercise',
        'Д-р Пападопулос'
      )

      expect(result.category).toBe('exercise')
      expect(result.titleBg).toBe('Двигателен режим')
      expect(result.doctorName).toBe('Д-р Пападопулос')
      expect(result.embedding).toEqual([0.25, 0.75])
      expect(result.semanticText).toContain('Правете 30 минути разходка дневно.')
      expect(result.semanticText).toContain('Περπάτημα 30 λεπτών ημερησίως.')
    })
  })

  describe('processPrescriptionFileAI', () => {
    it('attaches cloudflare-ai PDF file-parser plugin for application/pdf uploads', async () => {
      vi.mocked(openrouter.chat.completions.create).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title_bg: 'Схема за терапия',
                title_el: 'Θεραπευτικό πρωτόκολλο',
                note_bg: 'Приемайте Letrozole 2.5 mg веднъж дневно.',
                note_el: 'Λήψη Letrozole 2.5 mg άπαξ ημερησίως.',
                category: 'therapy',
                extracted_text: 'Letrozole 2.5 mg x 1',
              }),
            },
          },
        ],
      } as unknown as Awaited<ReturnType<typeof openrouter.chat.completions.create>>)
      vi.mocked(createEmbedding).mockResolvedValueOnce([0.5, 0.5])

      const res = await processPrescriptionFileAI({
        fileBase64: 'JVBERi0xLjQK',
        mimeType: 'application/pdf',
        fileName: 'protocol.pdf',
        category: 'therapy',
        doctorName: 'Д-р Специалист',
      })

      expect(res.category).toBe('therapy')
      expect(res.attachmentMime).toBe('application/pdf')

      const callPayload = vi.mocked(openrouter.chat.completions.create).mock.calls[0]?.[0] as unknown as {
        plugins?: Array<{ id: string }>
      }
      expect(callPayload.plugins).toEqual([{ id: 'file-parser', pdf: { engine: 'cloudflare-ai' } }])
    })
  })
})

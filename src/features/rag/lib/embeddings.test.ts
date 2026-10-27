import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEmbedding, expandBilingualQuery, RagError } from './embeddings'
import { openrouter } from '@/lib/openrouter'

vi.mock('@/lib/openrouter', () => ({
  AI_MODELS: {
    embedding: 'openai/text-embedding-3-small',
    fast: 'deepseek/deepseek-v4.1-flash',
  },
  openrouter: {
    embeddings: {
      create: vi.fn(),
    },
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}))

describe('RAG Embeddings & Bilingual Query Expansion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('OPENROUTER_API_KEY', 'sk-or-test-key')
  })

  describe('createEmbedding', () => {
    it('throws RagError(500) when OPENROUTER_API_KEY is missing', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', '')

      await expect(createEmbedding('Туморни маркери')).rejects.toMatchObject({
        name: 'RagError',
        statusCode: 500,
      })
    })

    it('throws RagError(400) when input is blank or whitespace', async () => {
      await expect(createEmbedding('   \n  ')).rejects.toMatchObject({
        name: 'RagError',
        statusCode: 400,
      })
      expect(openrouter.embeddings.create).not.toHaveBeenCalled()
    })

    it('throws RagError(502) when returned vector is not 1536 dimensions', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(openrouter.embeddings.create).mockResolvedValueOnce({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
      } as unknown as Awaited<ReturnType<typeof openrouter.embeddings.create>>)

      await expect(createEmbedding('CA 15-3 резултат')).rejects.toBeInstanceOf(RagError)
      spy.mockRestore()
    })

    it('returns 1536d vector and truncates oversized Greek text to safe token budget', async () => {
      const validVector = Array.from({ length: 1536 }, (_, idx) => idx * 0.0001)
      vi.mocked(openrouter.embeddings.create).mockResolvedValueOnce({
        data: [{ embedding: validVector }],
      } as unknown as Awaited<ReturnType<typeof openrouter.embeddings.create>>)

      const hugeGreekInput = 'Ογκολογική έκθεση ιστολογίας. '.repeat(600) // > 18,000 chars (~20k tokens)
      const vec = await createEmbedding(hugeGreekInput)

      expect(vec).toHaveLength(1536)
      const sentCall = vi.mocked(openrouter.embeddings.create).mock.calls[0]?.[0]
      expect(typeof sentCall?.input).toBe('string')
      expect((sentCall?.input as string).length).toBeLessThan(hugeGreekInput.length)
    })
  })

  describe('expandBilingualQuery', () => {
    it('returns empty string for empty query without calling OpenRouter', async () => {
      expect(await expandBilingualQuery('   ')).toBe('')
      expect(openrouter.chat.completions.create).not.toHaveBeenCalled()
    })

    it('appends expanded Greek/Bulgarian/Latin oncology synonyms to original query', async () => {
      vi.mocked(openrouter.chat.completions.create).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'CA 15-3 CEA καρκινικοί δείκτες туморни маркери',
            },
          },
        ],
      } as unknown as Awaited<ReturnType<typeof openrouter.chat.completions.create>>)

      const expanded = await expandBilingualQuery('Какви са маркерите?')
      expect(expanded).toBe('Какви са маркерите? CA 15-3 CEA καρκινικοί δείκτες туморни маркери')
    })

    it('falls back gracefully to original query if OpenRouter fails', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      vi.mocked(openrouter.chat.completions.create).mockRejectedValueOnce(
        new Error('OpenRouter 503')
      )

      const expanded = await expandBilingualQuery('Πότε έγινε η βιοψία;')
      expect(expanded).toBe('Πότε έγινε η βιοψία;')
      warnSpy.mockRestore()
    })
  })
})

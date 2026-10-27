import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  PipelineError,
  buildBilingualSemanticText,
  createMedicalEmbedding,
  estimateTokens,
  extractMedicalDocumentData,
  toClinicalMetadata,
  truncateToTokenBudget,
} from './ai-pipeline'
import { openrouter } from '@/lib/openrouter'

vi.mock('@/lib/openrouter', () => ({
  AI_MODELS: {
    vision: 'google/gemini-3.8-flash',
    chat: 'deepseek/deepseek-v4.1-flash',
    embedding: 'openai/text-embedding-3-small',
    fast: 'google/gemini-3.8-flash',
    longContext: 'google/gemini-3.8-flash',
  },
  openrouter: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
    embeddings: {
      create: vi.fn(),
    },
  },
}))

describe('AI Pipeline - Token Budget, Semantic Header Preservation & Embeddings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('OPENROUTER_API_KEY', 'sk-or-test-key')
  })

  it('estimates tokens with higher weight for Greek characters (~1.15 tokens/char)', () => {
    const greekText = 'Καλημέρα γιατρέ'
    const estimated = estimateTokens(greekText)
    expect(estimated).toBeGreaterThan(15)
  })

  it('estimates tokens accurately for Cyrillic and ASCII text', () => {
    const asciiText = 'Hello doctor'
    const cyrillicText = 'Здравейте докторе'

    expect(estimateTokens(asciiText)).toBe(Math.ceil(asciiText.length * 0.65))
    expect(estimateTokens(cyrillicText)).toBeGreaterThan(0)
  })

  it('returns empty string when budget is 0 or negative', () => {
    expect(truncateToTokenBudget('Sample clinical text', 0)).toBe('')
    expect(truncateToTokenBudget('Sample clinical text', -10)).toBe('')
  })

  it('returns original text if text token estimate is within budget', () => {
    const shortText = 'Епикриза: Пациентката е в стабилно състояние.'
    expect(truncateToTokenBudget(shortText, 500)).toBe(shortText)
  })

  it('preserves both start and end when text exceeds token budget', () => {
    const longText =
      'НАЧАЛО: Диагноза карцином. ' + 'Среда '.repeat(500) + ' заключение и контролен скенер.'
    const budget = 50
    const truncated = truncateToTokenBudget(longText, budget)

    expect(truncated).toContain('НАЧАЛО')
    expect(truncated).toContain('контролен скенер.')
    expect(truncated).toContain('[… съкратено / περικομμένο …]')
    expect(estimateTokens(truncated)).toBeLessThanOrEqual(budget + 5)
  })

  it('buildBilingualSemanticText keeps full clinical header intact while truncating long OCR body', () => {
    const semantic = buildBilingualSemanticText(
      {
        titleBg: 'Хистологичен доклад',
        titleEl: 'Ιστολογική Έκθεση',
        docDate: '2024-05-14',
        category: 'Хистология',
        summaryEl: 'Инвазивен дуктален карцином ER+ PR+ HER2-',
        metadata: {
          staging: 'pT2N1M0',
          keyMarkers: ['ER 95%', 'Ki-67 18%'],
          criticalAlerts: ['Лимфен възел положителен'],
          hospital: 'УМБАЛ София',
          doctor: 'Д-р Иванова',
        },
        extractedText: 'НАЧАЛО НА OCR ' + 'Πλήρες κείμενο ιστολογικής '.repeat(800) + ' КРАЙ НА OCR',
      },
      450
    )

    expect(semantic).toContain('Документ / Έγγραφο: Хистологичен доклад / Ιστολογική Έκθεση')
    expect(semantic).toContain('Стадий / Στάδιο: pT2N1M0')
    expect(semantic).toContain('Маркери / Δείκτες: ER 95%; Ki-67 18%')
    expect(semantic).toContain('Предупреждения / Προειδοποιήσεις: Лимфен възел положителен')
    expect(semantic).toContain('Болница / Νοσοκομείο: УМБАЛ София')
    expect(semantic).toContain('Резюме / Περίληψη: Инвазивен дуктален карцином ER+ PR+ HER2-')
    expect(semantic).toContain('[… съкратено / περικομμένο …]')
    expect(estimateTokens(semantic)).toBeLessThanOrEqual(460)
  })

  it('createMedicalEmbedding retries once with reduced budget on HTTP 400 context length error', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const validVector = Array.from({ length: 1536 }, (_, i) => i * 0.0001)

    vi.mocked(openrouter.embeddings.create)
      .mockRejectedValueOnce({
        status: 400,
        message: "This model's maximum context length is 8192 tokens",
      })
      .mockResolvedValueOnce({
        data: [{ embedding: validVector }],
      } as unknown as Awaited<ReturnType<typeof openrouter.embeddings.create>>)

    const hugeGreek = 'Ιστολογική εξέταση '.repeat(600)
    const result = await createMedicalEmbedding(hugeGreek)

    expect(result).toHaveLength(1536)
    expect(openrouter.embeddings.create).toHaveBeenCalledTimes(2)
    warnSpy.mockRestore()
  })

  it('createMedicalEmbedding throws PipelineError when embedding dimensions are invalid', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(openrouter.embeddings.create).mockResolvedValueOnce({
      data: [{ embedding: [0.1, 0.2, 0.3] }],
    } as unknown as Awaited<ReturnType<typeof openrouter.embeddings.create>>)

    await expect(createMedicalEmbedding('Тестов текст')).rejects.toThrow(PipelineError)
    errSpy.mockRestore()
  })

  it('extractMedicalDocumentData strips markdown fences, normalizes fields, and maps metadata', async () => {
    vi.mocked(openrouter.chat.completions.create).mockResolvedValueOnce({
      choices: [
        {
          finish_reason: 'stop',
          message: {
            content:
              '```json\n' +
              JSON.stringify({
                title_bg: 'Биопсия на млечна жлеза',
                title_el: 'Βιοψία μαστού',
                doc_date: '14.05.2024',
                category: 'Ιστολογική έκθεση',
                summary_el: 'Διηθητικό καρκίνωμα NST.',
                key_markers: ['ER+', 'PR+'],
                staging: 'cT1cN0M0',
                hospital: null,
                doctor: 'Д-р Петров',
                critical_alerts: null,
                extracted_text: 'Пълен текст от биопсията.',
              }) +
              '\n```',
          },
        },
      ],
    } as unknown as Awaited<ReturnType<typeof openrouter.chat.completions.create>>)

    const ocr = await extractMedicalDocumentData('data:image/jpeg;base64,/9j/4AAQ==', 'biopsy.jpg')
    expect(ocr.doc_date).toBe('2024-05-14')
    expect(ocr.category).toBe('Хистология')
    expect(ocr.critical_alerts).toEqual([])

    const meta = toClinicalMetadata(ocr)
    expect(meta).toEqual({
      hospital: undefined,
      doctor: 'Д-р Петров',
      staging: 'cT1cN0M0',
      keyMarkers: ['ER+', 'PR+'],
      criticalAlerts: [],
    })
  })
})

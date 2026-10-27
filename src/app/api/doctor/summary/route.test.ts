import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { verifySessionToken } from '@/features/auth/lib/session'
import { checkScopedRateLimit } from '@/features/auth/lib/role-guard'
import { getDossierForSummary } from '@/features/documents'
import { saveDossierSummary } from '@/features/dossier-summary/dal'
import { openrouter } from '@/lib/openrouter'
import type { DossierSourceDocument } from '@/features/documents/types'

vi.mock('@/features/auth/lib/session', () => ({
  SESSION_COOKIE_NAME: 'medbot_session',
  verifySessionToken: vi.fn(),
}))

vi.mock('@/features/auth/lib/role-guard', () => ({
  checkScopedRateLimit: vi.fn(),
}))

vi.mock('@/features/documents', () => ({
  getDossierForSummary: vi.fn(),
}))

vi.mock('@/features/dossier-summary/dal', () => ({
  getDossierSummaryState: vi.fn(),
  saveDossierSummary: vi.fn(),
}))

vi.mock('@/lib/openrouter', () => ({
  AI_MODELS: { longContext: 'google/gemini-3.8-flash' },
  openrouter: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}))

interface StreamChunk {
  choices: Array<{
    delta?: { content?: string }
    finish_reason?: string | null
  }>
}

async function* makeStream(chunks: StreamChunk[]): AsyncGenerator<StreamChunk> {
  for (const chunk of chunks) {
    yield chunk
  }
}

const sampleDoc: DossierSourceDocument = {
  id: 1,
  titleBg: 'Епикриза',
  titleEl: 'Εξιτήριο',
  docDate: '2024-05-01',
  category: 'Епикризи',
  summaryEl: 'Σταδιοποίηση pT1bN0M0.',
  extractedText: 'Пълен текст на епикризата.',
  metadata: { keyMarkers: ['ER+'], criticalAlerts: [] },
}

describe('POST /api/doctor/summary - Abort Handling & Stream Finish-Reason Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifySessionToken).mockResolvedValue({ role: 'doctor', createdAt: 1700000000 })
    vi.mocked(checkScopedRateLimit).mockResolvedValue({ allowed: true, remaining: 2 })
    vi.mocked(getDossierForSummary).mockResolvedValue([sampleDoc])
  })

  it('returns 499 immediately without calling OpenRouter when request.signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    const req = new NextRequest('http://localhost:3000/api/doctor/summary', {
      method: 'POST',
      headers: { cookie: 'medbot_session=doc-token' },
      signal: controller.signal,
    })

    const res = await POST(req)
    expect(res.status).toBe(499)
    expect(openrouter.chat.completions.create).not.toHaveBeenCalled()
    expect(saveDossierSummary).not.toHaveBeenCalled()
  })

  it('does NOT save summary and emits error SSE when finish_reason is missing or length-truncated', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const longText = 'Κλινική περίληψη ογκολογικού φακέλου με πλήρη στοιχεία. '.repeat(6) // > 300 chars

    vi.mocked(openrouter.chat.completions.create).mockResolvedValueOnce(
      makeStream([
        { choices: [{ delta: { content: longText }, finish_reason: null }] },
      ]) as unknown as Awaited<ReturnType<typeof openrouter.chat.completions.create>>
    )

    const req = new NextRequest('http://localhost:3000/api/doctor/summary', {
      method: 'POST',
      headers: { cookie: 'medbot_session=doc-token' },
    })

    const res = await POST(req)
    const sseText = await res.text()

    expect(sseText).toContain('"type":"error"')
    expect(saveDossierSummary).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('saves summary and emits done SSE only when finish_reason === "stop" and length >= 200', async () => {
    const validSummary = 'Αναλυτική ογκολογική περίληψη φακέλου [📄 Εξιτήριο (2024-05-01)](/api/doc/1). '.repeat(4)

    vi.mocked(openrouter.chat.completions.create).mockResolvedValueOnce(
      makeStream([
        { choices: [{ delta: { content: validSummary }, finish_reason: null }] },
        { choices: [{ delta: { content: '' }, finish_reason: 'stop' }] },
      ]) as unknown as Awaited<ReturnType<typeof openrouter.chat.completions.create>>
    )
    vi.mocked(saveDossierSummary).mockResolvedValueOnce({
      id: 9,
      contentEl: validSummary,
      documentIds: [1],
      documentCount: 1,
      truncatedDocCount: 0,
      model: 'google/gemini-3.8-flash',
      createdAt: '2025-02-01T12:00:00.000Z',
    })

    const req = new NextRequest('http://localhost:3000/api/doctor/summary', {
      method: 'POST',
      headers: { cookie: 'medbot_session=doc-token' },
    })

    const res = await POST(req)
    const sseText = await res.text()

    expect(saveDossierSummary).toHaveBeenCalledTimes(1)
    expect(sseText).toContain('"type":"done"')
  })
})

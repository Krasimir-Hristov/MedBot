import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { requireRoles, checkScopedRateLimit } from '@/features/auth/lib/role-guard'
import { getRagContextBundle } from '@/features/rag'
import {
  getPatientChatMessages,
  getPatientChatSessionById,
  savePatientChatTurn,
} from '@/features/patient/dal'
import { openrouter } from '@/lib/openrouter'

vi.mock('@/features/auth/lib/role-guard', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/lib/role-guard')>(
    '@/features/auth/lib/role-guard'
  )
  return {
    AuthError: actual.AuthError,
    requireRoles: vi.fn(),
    checkScopedRateLimit: vi.fn(),
  }
})

vi.mock('@/features/rag', () => ({
  getRagContextBundle: vi.fn(),
}))

vi.mock('@/features/patient/dal', () => ({
  getPatientChatMessages: vi.fn(),
  getPatientChatSessionById: vi.fn(),
  savePatientChatTurn: vi.fn(),
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

async function* makeChatStream(tokens: string[]): AsyncGenerator<{
  choices: Array<{ delta?: { content?: string } }>
}> {
  for (const token of tokens) {
    yield { choices: [{ delta: { content: token } }] }
  }
}

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('POST /api/chat/patient - Turn Persistence Before Stream Close', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireRoles).mockResolvedValue({ role: 'patient', createdAt: 1700000000 })
    vi.mocked(checkScopedRateLimit).mockResolvedValue({ allowed: true, remaining: 24 })
    vi.mocked(getRagContextBundle).mockResolvedValue({
      matchedNotes: [],
      matchedDocuments: [],
      recentDoctorNotes: [],
    })
    vi.mocked(getPatientChatMessages).mockResolvedValue([])
  })

  it('returns 404 when chat session does not exist or belongs to another role', async () => {
    vi.mocked(getPatientChatSessionById).mockResolvedValueOnce(null)

    const req = new NextRequest('http://localhost:3000/api/chat/patient', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Какво да ям?', sessionId: VALID_UUID }),
    })

    const res = await POST(req)
    expect(res.status).toBe(404)
    expect(openrouter.chat.completions.create).not.toHaveBeenCalled()
  })

  it('persists chat turn via savePatientChatTurn BEFORE stream reader finishes', async () => {
    const events: string[] = []

    vi.mocked(getPatientChatSessionById).mockResolvedValueOnce({
      id: 1,
      sessionId: VALID_UUID,
      role: 'patient',
      title: 'Въпрос за хранене',
      createdAt: new Date('2025-02-01T10:00:00.000Z'),
      updatedAt: new Date('2025-02-01T10:00:00.000Z'),
    })
    vi.mocked(openrouter.chat.completions.create).mockResolvedValueOnce(
      makeChatStream(['Пийте ', 'поне 2 литра вода.']) as unknown as Awaited<
        ReturnType<typeof openrouter.chat.completions.create>
      >
    )
    vi.mocked(savePatientChatTurn).mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15))
      events.push('saved-to-db')
    })

    const req = new NextRequest('http://localhost:3000/api/chat/patient', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Колко вода да пия?', sessionId: VALID_UUID }),
    })

    const res = await POST(req)
    const text = await res.text()
    events.push('stream-closed')

    expect(text).toBe('Пийте поне 2 литра вода.')
    expect(events).toEqual(['saved-to-db', 'stream-closed'])
    expect(savePatientChatTurn).toHaveBeenCalledWith(
      VALID_UUID,
      'Колко вода да пия?',
      'Пийте поне 2 литра вода.'
    )
  })
})

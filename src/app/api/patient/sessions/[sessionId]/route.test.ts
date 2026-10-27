import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH, DELETE } from './route'
import { verifySessionToken } from '@/features/auth/lib/session'
import {
  deletePatientChatSession,
  renamePatientChatSession,
} from '@/features/patient/dal'

vi.mock('@/lib/db', () => ({
  db: {},
}))

vi.mock('@/features/auth/lib/session', () => ({
  SESSION_COOKIE_NAME: 'medbot_session',
  verifySessionToken: vi.fn(),
}))

vi.mock('@/features/patient/dal', async () => {
  const actual = await vi.importActual<typeof import('@/features/patient/dal')>(
    '@/features/patient/dal'
  )
  return {
    SessionNotFoundError: actual.SessionNotFoundError,
    getPatientChatMessages: vi.fn(),
    renamePatientChatSession: vi.fn(),
    deletePatientChatSession: vi.fn(),
  }
})

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440000'
const makeContext = () => ({ params: Promise.resolve({ sessionId: SESSION_ID }) })

describe('/api/patient/sessions/[sessionId] - Typed SessionNotFoundError (404 vs 500)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifySessionToken).mockResolvedValue({ role: 'patient', createdAt: 1700000000 })
  })

  it('returns 404 on PATCH when renamePatientChatSession throws SessionNotFoundError', async () => {
    const { SessionNotFoundError } = await import('@/features/patient/dal')
    vi.mocked(renamePatientChatSession).mockRejectedValueOnce(new SessionNotFoundError())

    const req = new NextRequest(`http://localhost:3000/api/patient/sessions/${SESSION_ID}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        cookie: 'medbot_session=patient-jwt',
      },
      body: JSON.stringify({ title: 'Ново заглавие' }),
    })

    const res = await PATCH(req, makeContext())
    expect(res.status).toBe(404)
  })

  it('returns 500 (not 404) on PATCH when an unexpected DB error occurs', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(renamePatientChatSession).mockRejectedValueOnce(new Error('Neon connection lost'))

    const req = new NextRequest(`http://localhost:3000/api/patient/sessions/${SESSION_ID}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        cookie: 'medbot_session=patient-jwt',
      },
      body: JSON.stringify({ title: 'Ново заглавие' }),
    })

    const res = await PATCH(req, makeContext())
    expect(res.status).toBe(500)
    errSpy.mockRestore()
  })

  it('returns 404 on DELETE for SessionNotFoundError and 401 for doctor role', async () => {
    const { SessionNotFoundError } = await import('@/features/patient/dal')
    vi.mocked(deletePatientChatSession).mockRejectedValueOnce(new SessionNotFoundError())

    const req = new NextRequest(`http://localhost:3000/api/patient/sessions/${SESSION_ID}`, {
      method: 'DELETE',
      headers: { cookie: 'medbot_session=patient-jwt' },
    })

    const notFoundRes = await DELETE(req, makeContext())
    expect(notFoundRes.status).toBe(404)

    vi.mocked(verifySessionToken).mockResolvedValueOnce({ role: 'doctor', createdAt: 1700000000 })
    const forbiddenRoleRes = await DELETE(req, makeContext())
    expect(forbiddenRoleRes.status).toBe(401)
  })
})

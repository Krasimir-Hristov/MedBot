import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { verifySessionToken } from '@/features/auth/lib/session'
import { getDocumentBinaryById } from '@/features/documents'

vi.mock('@/features/auth/lib/session', () => ({
  SESSION_COOKIE_NAME: 'medbot_session',
  verifySessionToken: vi.fn(),
}))

vi.mock('@/features/documents', () => ({
  getDocumentBinaryById: vi.fn(),
}))

describe('GET /api/doc/[id] - Defense-in-Depth & Binary Scan Serving', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated requests and 403 for patient role', async () => {
    const req = new NextRequest('http://localhost:3000/api/doc/5')
    const ctx = { params: Promise.resolve({ id: '5' }) }

    vi.mocked(verifySessionToken).mockResolvedValueOnce(null)
    const unauth = await GET(req, ctx)
    expect(unauth.status).toBe(401)

    vi.mocked(verifySessionToken).mockResolvedValueOnce({ role: 'patient', createdAt: 1700000000 })
    const patientForbidden = await GET(req, ctx)
    expect(patientForbidden.status).toBe(403)
    expect(getDocumentBinaryById).not.toHaveBeenCalled()
  })

  it('validates positive integer ID (400) and returns 404 when document is missing', async () => {
    vi.mocked(verifySessionToken).mockResolvedValue({ role: 'doctor', createdAt: 1700000000 })
    const req = new NextRequest('http://localhost:3000/api/doc/invalid')

    const badId = await GET(req, { params: Promise.resolve({ id: '0' }) })
    expect(badId.status).toBe(400)

    vi.mocked(getDocumentBinaryById).mockResolvedValueOnce(null)
    const missing = await GET(req, { params: Promise.resolve({ id: '42' }) })
    expect(missing.status).toBe(404)
  })

  it('strips data URL prefix and serves decoded binary buffer with private cache headers', async () => {
    vi.mocked(verifySessionToken).mockResolvedValue({ role: 'doctor', createdAt: 1700000000 })
    const sampleBytes = Buffer.from('JPEG-SCAN-BINARY-CONTENT')
    vi.mocked(getDocumentBinaryById).mockResolvedValueOnce({
      id: 7,
      titleBg: 'Епикриза',
      mimeType: 'image/jpeg',
      fileBase64: `data:image/jpeg;base64,${sampleBytes.toString('base64')}`,
    })

    const req = new NextRequest('http://localhost:3000/api/doc/7')
    const res = await GET(req, { params: Promise.resolve({ id: '7' }) })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="doc-7.jpg"')
    expect(res.headers.get('Cache-Control')).toContain('private')

    const bodyBuffer = Buffer.from(await res.arrayBuffer())
    expect(bodyBuffer.equals(sampleBytes)).toBe(true)
  })
})

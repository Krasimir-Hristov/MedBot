import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { SignJWT } from 'jose'
import { proxy } from './proxy'

const TEST_SECRET = 'test-super-secret-medbot-jwt-key-32-chars!!'

const makeSignedToken = async (role: string): Promise<string> => {
  const key = new TextEncoder().encode(TEST_SECRET)
  return await new SignJWT({ role, createdAt: Math.floor(Date.now() / 1000) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key)
}

const buildRequest = (
  path: string,
  options?: { token?: string; extraHeaders?: Record<string, string> }
): NextRequest => {
  const headers = new Headers(options?.extraHeaders)
  if (options?.token) {
    headers.set('cookie', `medbot_session=${options.token}`)
  }
  return new NextRequest(`http://localhost:3000${path}`, { headers })
}

describe('Edge Proxy - CVE-2025-29927 Mitigation & RBAC Routing', () => {
  beforeEach(() => {
    vi.stubEnv('SESSION_SECRET', TEST_SECRET)
  })

  describe('CVE-2025-29927 Defensive Header Scrubbing', () => {
    it('strips x-middleware-subrequest, x-middleware-rewrite, and x-middleware-next headers', async () => {
      const req = buildRequest('/', {
        extraHeaders: {
          'x-middleware-subrequest': 'middleware:middleware:middleware',
          'X-Middleware-Rewrite': 'http://evil.local/admin',
          'x-middleware-next': '1',
          'x-forwarded-for': '203.0.113.42',
        },
      })

      const res = await proxy(req)

      // NextResponse.next({ request: { headers } }) encodes overridden headers in x-middleware-override-headers
      const overrideList = res.headers.get('x-middleware-override-headers') ?? ''
      expect(overrideList).not.toContain('x-middleware-subrequest')
      expect(overrideList).not.toContain('x-middleware-rewrite')
      expect(overrideList).not.toContain('x-middleware-next')
      expect(overrideList).toContain('x-forwarded-for')
      expect(res.headers.get('x-middleware-request-x-forwarded-for')).toBe('203.0.113.42')
    })
  })

  describe('Root Path (/) Role-Based Redirects', () => {
    it('allows unauthenticated visitor to view PIN login page on /', async () => {
      const res = await proxy(buildRequest('/'))
      expect(res.status).toBe(200)
      expect(res.headers.get('location')).toBeNull()
    })

    it('redirects authenticated admin, doctor, and patient from / to their portals', async () => {
      const [adminToken, doctorToken, patientToken] = await Promise.all([
        makeSignedToken('admin'),
        makeSignedToken('doctor'),
        makeSignedToken('patient'),
      ])

      const adminRes = await proxy(buildRequest('/', { token: adminToken }))
      expect(adminRes.status).toBe(307)
      expect(new URL(adminRes.headers.get('location') ?? '').pathname).toBe('/admin')

      const doctorRes = await proxy(buildRequest('/', { token: doctorToken }))
      expect(doctorRes.status).toBe(307)
      expect(new URL(doctorRes.headers.get('location') ?? '').pathname).toBe('/doctor')

      const patientRes = await proxy(buildRequest('/', { token: patientToken }))
      expect(patientRes.status).toBe(307)
      expect(new URL(patientRes.headers.get('location') ?? '').pathname).toBe('/patient')
    })
  })

  describe('Portal Page Route Guards', () => {
    it('blocks non-admin roles from /admin and allows admin', async () => {
      const doctorToken = await makeSignedToken('doctor')
      const adminToken = await makeSignedToken('admin')

      const blocked = await proxy(buildRequest('/admin', { token: doctorToken }))
      expect(blocked.status).toBe(307)
      expect(new URL(blocked.headers.get('location') ?? '').pathname).toBe('/')

      const allowed = await proxy(buildRequest('/admin', { token: adminToken }))
      expect(allowed.status).toBe(200)
    })

    it('rejects tokens without exp claim and redirects to /', async () => {
      const key = new TextEncoder().encode(TEST_SECRET)
      const tokenWithoutExp = await new SignJWT({ role: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .sign(key)

      const blocked = await proxy(buildRequest('/admin', { token: tokenWithoutExp }))
      expect(blocked.status).toBe(307)
      expect(new URL(blocked.headers.get('location') ?? '').pathname).toBe('/')
    })

    it('isolates /doctor and /patient portals between doctor and patient roles', async () => {
      const doctorToken = await makeSignedToken('doctor')
      const patientToken = await makeSignedToken('patient')

      const patientOnDoctor = await proxy(buildRequest('/doctor', { token: patientToken }))
      expect(patientOnDoctor.status).toBe(307)

      const doctorOnPatient = await proxy(buildRequest('/patient', { token: doctorToken }))
      expect(doctorOnPatient.status).toBe(307)

      const doctorOk = await proxy(buildRequest('/doctor', { token: doctorToken }))
      const patientOk = await proxy(buildRequest('/patient', { token: patientToken }))
      expect(doctorOk.status).toBe(200)
      expect(patientOk.status).toBe(200)
    })
  })

  describe('API Route Authorization (401 vs 403)', () => {
    it('protects /api/doc/[id] with 401 for unauthenticated and 403 for patient', async () => {
      const patientToken = await makeSignedToken('patient')
      const doctorToken = await makeSignedToken('doctor')

      const unauthRes = await proxy(buildRequest('/api/doc/12'))
      expect(unauthRes.status).toBe(401)

      const patientRes = await proxy(buildRequest('/api/doc/12', { token: patientToken }))
      expect(patientRes.status).toBe(403)

      const doctorRes = await proxy(buildRequest('/api/doc/12', { token: doctorToken }))
      expect(doctorRes.status).toBe(200)
    })

    it('restricts /api/notes/upload to doctor/admin while allowing patient on /api/notes/[id]/file', async () => {
      const patientToken = await makeSignedToken('patient')
      const doctorToken = await makeSignedToken('doctor')

      const patientUpload = await proxy(buildRequest('/api/notes/upload', { token: patientToken }))
      expect(patientUpload.status).toBe(403)

      const doctorUpload = await proxy(buildRequest('/api/notes/upload', { token: doctorToken }))
      expect(doctorUpload.status).toBe(200)

      const patientReadAttachment = await proxy(
        buildRequest('/api/notes/5/file', { token: patientToken })
      )
      expect(patientReadAttachment.status).toBe(200)
    })

    it('enforces role boundaries on /api/chat/patient and /api/doctor/summary', async () => {
      const patientToken = await makeSignedToken('patient')
      const doctorToken = await makeSignedToken('doctor')

      const doctorOnPatientChat = await proxy(
        buildRequest('/api/chat/patient', { token: doctorToken })
      )
      expect(doctorOnPatientChat.status).toBe(403)

      const patientOnDoctorSummary = await proxy(
        buildRequest('/api/doctor/summary', { token: patientToken })
      )
      expect(patientOnDoctorSummary.status).toBe(403)
    })
  })
})

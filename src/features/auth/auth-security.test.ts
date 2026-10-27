import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SignJWT } from 'jose'
import { verifyPinAndGetRole } from './lib/pin'
import { createSessionToken, verifySessionToken } from './lib/session'
import { loginWithPinAction } from './actions'

let mockRequestHeaders: Record<string, string> = {}
const mockCookieSet = vi.fn()
const mockCookieDelete = vi.fn()

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => mockRequestHeaders[name.toLowerCase()] ?? null,
  })),
  cookies: vi.fn(async () => ({
    get: () => undefined,
    set: mockCookieSet,
    delete: mockCookieDelete,
  })),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

const TEST_SECRET = 'medbot-auth-unit-test-secret-key-minimum-32-bytes!'

describe('Authentication Security - HMAC PIN, JWT Session & Brute-Force Defense', () => {
  beforeEach(() => {
    vi.stubEnv('SESSION_SECRET', TEST_SECRET)
    vi.stubEnv('ADMIN_PIN', 'ADM999')
    vi.stubEnv('DOCTOR_PIN', 'DOC777')
    vi.stubEnv('PATIENT_PIN', 'PAT111')
    mockRequestHeaders = {}
    mockCookieSet.mockClear()
    mockCookieDelete.mockClear()
  })

  describe('verifyPinAndGetRole (HMAC timingSafeEqual)', () => {
    it('maps valid trimmed PINs to admin, doctor, and patient roles', () => {
      expect(verifyPinAndGetRole('ADM999')).toBe('admin')
      expect(verifyPinAndGetRole('  DOC777  ')).toBe('doctor')
      expect(verifyPinAndGetRole('PAT111')).toBe('patient')
    })

    it('rejects empty, wrong, or different-length PINs safely', () => {
      expect(verifyPinAndGetRole('')).toBeNull()
      expect(verifyPinAndGetRole('   ')).toBeNull()
      expect(verifyPinAndGetRole('ADM998')).toBeNull()
      expect(verifyPinAndGetRole('SHORT')).toBeNull()
      expect(verifyPinAndGetRole('VERYLONGWRONGPIN12345')).toBeNull()
    })
  })

  describe('createSessionToken & verifySessionToken (HS256 JWT)', () => {
    it('signs a token with role and jti and verifies it back cleanly', async () => {
      const token = await createSessionToken('doctor')
      const payload = await verifySessionToken(token)

      expect(payload).not.toBeNull()
      expect(payload?.role).toBe('doctor')
      expect(typeof payload?.jti).toBe('string')
      expect(typeof payload?.createdAt).toBe('number')
    })

    it('returns null for undefined, malformed, tampered, or invalid-role tokens', async () => {
      expect(await verifySessionToken(undefined)).toBeNull()
      expect(await verifySessionToken('not.a.jwt')).toBeNull()

      const wrongKeyToken = await new SignJWT({ role: 'admin', createdAt: 1000 })
        .setProtectedHeader({ alg: 'HS256' })
        .sign(new TextEncoder().encode('wrong-secret-key-at-least-32-characters-long!!'))
      expect(await verifySessionToken(wrongKeyToken)).toBeNull()

      const unknownRoleToken = await new SignJWT({ role: 'superadmin', createdAt: 1000 })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(TEST_SECRET))
      expect(await verifySessionToken(unknownRoleToken)).toBeNull()
    })

    it('rejects signed admin token missing exp claim', async () => {
      const tokenWithoutExp = await new SignJWT({ role: 'admin', createdAt: 1000 })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .sign(new TextEncoder().encode(TEST_SECRET))

      expect(await verifySessionToken(tokenWithoutExp)).toBeNull()
    })
  })

  describe('loginWithPinAction & Trusted Proxy Chain Rate Limiting', () => {
    it('rejects non-alphanumeric or too-short PINs with VALIDATION_ERROR', async () => {
      mockRequestHeaders = { 'x-real-ip': '198.51.100.10' }
      const fd = new FormData()
      fd.set('pin', '12')

      const res = await loginWithPinAction(fd)
      expect(res.success).toBe(false)
      expect(res.errorCode).toBe('VALIDATION_ERROR')
    })

    it('ignores spoofed left-most X-Forwarded-For IP behind private proxy hops and rate-limits real client IP', async () => {
      // Attacker rotates fake left-most IP while real public IP before internal proxy 10.0.0.5 is 198.51.100.77
      const fd = new FormData()
      fd.set('pin', '99') // Fast validation error still counts against IP rate limit

      for (let attempt = 1; attempt <= 10; attempt += 1) {
        mockRequestHeaders = {
          'x-forwarded-for': `203.0.113.${attempt}, 198.51.100.77, 10.0.0.5`,
        }
        const res = await loginWithPinAction(fd)
        expect(res.errorCode).toBe('VALIDATION_ERROR')
      }

      // 11th attempt from same real IP (even with a brand-new spoofed left-most IP!) must be blocked
      mockRequestHeaders = {
        'x-forwarded-for': '203.0.113.250, 198.51.100.77, 10.0.0.5',
      }
      const blocked = await loginWithPinAction(fd)
      expect(blocked.success).toBe(false)
      expect(blocked.errorCode).toBe('RATE_LIMITED')

      // Meanwhile a legitimate different public IP is NOT blocked
      mockRequestHeaders = {
        'x-forwarded-for': '198.51.100.88, 10.0.0.5',
      }
      const otherClient = await loginWithPinAction(fd)
      expect(otherClient.errorCode).toBe('VALIDATION_ERROR')
    })
  })
})

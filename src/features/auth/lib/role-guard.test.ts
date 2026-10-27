import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthError, checkScopedRateLimit, requireRoles } from './role-guard'
import * as sessionModule from './session'

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => {
      if (name === 'x-forwarded-for') return '192.168.1.100, 10.0.0.1'
      return null
    },
  })),
}))

describe('Auth & Protection - Role Guard & Rate Limiter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('AuthError', () => {
    it('initializes with default status code 401', () => {
      const err = new AuthError('Неоторизиран')
      expect(err.message).toBe('Неоторизиран')
      expect(err.statusCode).toBe(401)
      expect(err.name).toBe('AuthError')
    })

    it('supports custom status code 403', () => {
      const err = new AuthError('Забранен достъп', 403)
      expect(err.message).toBe('Забранен достъп')
      expect(err.statusCode).toBe(403)
    })
  })

  describe('requireRoles', () => {
    it('throws 401 AuthError when session does not exist', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue(null)

      await expect(requireRoles(['doctor', 'admin'])).rejects.toThrowError(
        new AuthError('Неоторизиран достъп. Моля, влезте в системата.', 401)
      )
    })

    it('throws 403 AuthError when session role is not allowed', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        role: 'patient',
        createdAt: Date.now(),
      })

      await expect(requireRoles(['doctor', 'admin'])).rejects.toThrowError(
        new AuthError('Нямате необходимите права за това действие.', 403)
      )
    })

    it('returns session when role is in allowed roles', async () => {
      const validSession = {
        role: 'doctor' as const,
        createdAt: Date.now(),
      }
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue(validSession)

      const result = await requireRoles(['doctor', 'admin'])
      expect(result).toEqual(validSession)
    })
  })

  describe('checkScopedRateLimit', () => {
    it('allows requests up to the configured limit and blocks excess requests', async () => {
      const scope = `test-scope-${Date.now()}`
      const limit = 3
      const identity = 'test-user-1'

      const r1 = await checkScopedRateLimit(scope, limit, 60_000, identity)
      expect(r1.allowed).toBe(true)
      expect(r1.remaining).toBe(2)

      const r2 = await checkScopedRateLimit(scope, limit, 60_000, identity)
      expect(r2.allowed).toBe(true)
      expect(r2.remaining).toBe(1)

      const r3 = await checkScopedRateLimit(scope, limit, 60_000, identity)
      expect(r3.allowed).toBe(true)
      expect(r3.remaining).toBe(0)

      const r4 = await checkScopedRateLimit(scope, limit, 60_000, identity)
      expect(r4.allowed).toBe(false)
      expect(r4.remaining).toBe(0)
    })

    it('isolates limits across different identities', async () => {
      const scope = `test-multi-${Date.now()}`
      const limit = 2

      await checkScopedRateLimit(scope, limit, 60_000, 'user-a')
      await checkScopedRateLimit(scope, limit, 60_000, 'user-a')
      const userAThird = await checkScopedRateLimit(scope, limit, 60_000, 'user-a')
      expect(userAThird.allowed).toBe(false)

      // user-b is independent
      const userBFirst = await checkScopedRateLimit(scope, limit, 60_000, 'user-b')
      expect(userBFirst.allowed).toBe(true)
      expect(userBFirst.remaining).toBe(1)
    })
  })
})

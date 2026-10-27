import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  SessionNotFoundError,
  getPatientChatSessionById,
  renamePatientChatSession,
  deletePatientChatSession,
} from './dal'
import { db } from '@/lib/db'

vi.mock('@/lib/db', () => {
  return {
    db: {
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      insert: vi.fn(),
    },
    chatSessions: {
      sessionId: 'session_id',
      role: 'role',
      updatedAt: 'updated_at',
      title: 'title',
      id: 'id',
    },
    chatMessages: {
      sessionId: 'session_id',
      createdAt: 'created_at',
      id: 'id',
    },
    medicalDocuments: {
      id: 'id',
      docDate: 'doc_date',
    },
  }
})

describe('Patient DAL - Session Operations & Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('SessionNotFoundError', () => {
    it('is an instance of Error with name SessionNotFoundError', () => {
      const err = new SessionNotFoundError('Сесията липсва.')
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe('SessionNotFoundError')
      expect(err.message).toBe('Сесията липсва.')
    })

    it('has default Bulgarian error message', () => {
      const err = new SessionNotFoundError()
      expect(err.message).toBe('Сесията не е намерена.')
    })
  })

  describe('getPatientChatSessionById', () => {
    it('returns session object when record is found', async () => {
      const mockSession = {
        id: 1,
        sessionId: 'sess-123',
        role: 'patient',
        title: 'Разговор 1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockLimit = vi.fn().mockResolvedValue([mockSession])
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof db.select>)

      const result = await getPatientChatSessionById('sess-123')
      expect(result).toEqual(mockSession)
    })

    it('returns null when no record is found without throwing', async () => {
      const mockLimit = vi.fn().mockResolvedValue([])
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof db.select>)

      const result = await getPatientChatSessionById('non-existent')
      expect(result).toBeNull()
    })

    it('re-throws database errors instead of swallowing them as null', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const dbError = new Error('Neon connection timeout')
      const mockLimit = vi.fn().mockRejectedValue(dbError)
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof db.select>)

      await expect(getPatientChatSessionById('sess-123')).rejects.toThrow('Neon connection timeout')
      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('renamePatientChatSession', () => {
    it('returns updated session on success', async () => {
      const updated = {
        id: 1,
        sessionId: 'sess-123',
        role: 'patient',
        title: 'Ново заглавие',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockReturning = vi.fn().mockResolvedValue([updated])
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning })
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere })
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as ReturnType<typeof db.update>)

      const result = await renamePatientChatSession('sess-123', 'Ново заглавие')
      expect(result).toEqual(updated)
    })

    it('throws SessionNotFoundError when session does not exist in DB', async () => {
      const mockReturning = vi.fn().mockResolvedValue([])
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning })
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere })
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as ReturnType<typeof db.update>)

      await expect(renamePatientChatSession('sess-missing', 'Заглавие')).rejects.toThrow(
        SessionNotFoundError
      )
    })
  })

  describe('deletePatientChatSession', () => {
    it('returns true when session is deleted', async () => {
      const mockReturning = vi.fn().mockResolvedValue([{ id: 1 }])
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning })
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as unknown as ReturnType<typeof db.delete>)

      const result = await deletePatientChatSession('sess-123')
      expect(result).toBe(true)
    })

    it('throws SessionNotFoundError when session to delete does not exist', async () => {
      const mockReturning = vi.fn().mockResolvedValue([])
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning })
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as unknown as ReturnType<typeof db.delete>)

      await expect(deletePatientChatSession('sess-missing')).rejects.toThrow(
        SessionNotFoundError
      )
    })
  })
})

import { describe, it, expect } from 'vitest'
import {
  PatientChatRequestSchema,
  PatientSessionCreateSchema,
  PatientSessionUpdateSchema,
} from './schemas'

describe('Patient Portal - Zod Schemas', () => {
  describe('PatientChatRequestSchema', () => {
    it('accepts valid patient question with default session and locale', () => {
      const input = {
        message: 'Какво мога да ям днес?',
      }

      const parsed = PatientChatRequestSchema.safeParse(input)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.message).toBe('Какво мога да ям днес?')
        expect(parsed.data.sessionId).toBe('patient-primary-active')
        expect(parsed.data.locale).toBe('bg')
      }
    })

    it('rejects empty or whitespace-only message', () => {
      expect(PatientChatRequestSchema.safeParse({ message: '' }).success).toBe(false)
      expect(PatientChatRequestSchema.safeParse({ message: '   ' }).success).toBe(false)
    })

    it('rejects questions exceeding 2000 characters', () => {
      const longMessage = 'Въпрос '.repeat(400)
      const parsed = PatientChatRequestSchema.safeParse({ message: longMessage })
      expect(parsed.success).toBe(false)
    })

    it('accepts custom sessionId and Greek locale', () => {
      const input = {
        message: 'Τι εξετάσεις χρειάζονται;',
        sessionId: 'session-xyz-123',
        locale: 'el',
      }
      const parsed = PatientChatRequestSchema.safeParse(input)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.locale).toBe('el')
        expect(parsed.data.sessionId).toBe('session-xyz-123')
      }
    })
  })

  describe('PatientSessionUpdateSchema', () => {
    it('accepts valid title within 100 characters', () => {
      const input = { title: 'Консултация за диета' }
      expect(PatientSessionUpdateSchema.safeParse(input).success).toBe(true)
    })

    it('rejects empty or whitespace-only title', () => {
      expect(PatientSessionUpdateSchema.safeParse({ title: '' }).success).toBe(false)
      expect(PatientSessionUpdateSchema.safeParse({ title: '   ' }).success).toBe(false)
    })

    it('rejects title longer than 100 characters', () => {
      const input = { title: 'A'.repeat(101) }
      expect(PatientSessionUpdateSchema.safeParse(input).success).toBe(false)
    })
  })

  describe('PatientSessionCreateSchema', () => {
    it('provides default title if not supplied', () => {
      const parsed = PatientSessionCreateSchema.safeParse({})
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.title).toBe('Нов разговор')
      }
    })
  })
})

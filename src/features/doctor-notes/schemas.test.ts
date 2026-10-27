import { describe, it, expect } from 'vitest'
import { CreateTextNoteSchema, UploadPrescriptionPayloadSchema } from './schemas'

describe('Doctor Notes & Prescriptions - Zod Schemas', () => {
  describe('CreateTextNoteSchema', () => {
    it('accepts valid note text and applies default category and doctorName', () => {
      const parsed = CreateTextNoteSchema.safeParse({
        noteText: 'Συνιστάται ήπιο περπάτημα 30 λεπτά την ημέρα.',
      })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.category).toBe('general')
        expect(parsed.data.doctorName).toBe('Д-р Специалист')
      }
    })

    it('rejects too-short note text', () => {
      expect(CreateTextNoteSchema.safeParse({ noteText: 'ab' }).success).toBe(false)
    })
  })

  describe('UploadPrescriptionPayloadSchema', () => {
    it('accepts supported PDF and image MIME types', () => {
      const parsed = UploadPrescriptionPayloadSchema.safeParse({
        fileName: 'prescription.pdf',
        fileBase64: 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2c+PgplbmRvYmoK',
        mimeType: 'application/pdf',
        category: 'therapy',
      })
      expect(parsed.success).toBe(true)
    })

    it('rejects unsupported executable or HTML MIME types', () => {
      const parsed = UploadPrescriptionPayloadSchema.safeParse({
        fileName: 'payload.html',
        fileBase64: 'PGh0bWw+PGJvZHk+PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0PjwvYm9keT48L2h0bWw+',
        mimeType: 'text/html',
      })
      expect(parsed.success).toBe(false)
    })
  })
})

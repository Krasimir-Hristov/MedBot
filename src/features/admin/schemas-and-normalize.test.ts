import { describe, it, expect } from 'vitest'
import { normalizeCategory, normalizeDate } from './lib/normalize'
import { UploadPayloadSchema, UpdateDocumentSchema, VisionOcrResultSchema } from './schemas'

describe('Admin Normalization & Document Zod Schemas', () => {
  describe('normalizeCategory', () => {
    it('maps Bulgarian, Greek, and English clinical terms to canonical categories', () => {
      expect(normalizeCategory('Патоанатомична биопсия')).toBe('Хистология')
      expect(normalizeCategory('Ιστολογική εξέταση')).toBe('Хистология')
      expect(normalizeCategory('PET-CT whole body')).toBe('Образна диагностика')
      expect(normalizeCategory('Αξονική τομογραφία')).toBe('Образна диагностика')
      expect(normalizeCategory('CA 15-3 и CEA')).toBe('Туморни маркери')
      expect(normalizeCategory('Εξιτήριο κλινικής')).toBe('Епикризи')
      expect(normalizeCategory('Пълна кръвна картина')).toBe('Лабораторни изследвания')
      expect(normalizeCategory('Консултативен лист')).toBe('Други')
    })
  })

  describe('normalizeDate', () => {
    it('converts European and non-padded ISO dates to YYYY-MM-DD', () => {
      expect(normalizeDate('05.03.2024')).toBe('2024-03-05')
      expect(normalizeDate('5/3/2024')).toBe('2024-03-05')
      expect(normalizeDate('15-11-2023')).toBe('2023-11-15')
      expect(normalizeDate('2024/4/9')).toBe('2024-04-09')
      expect(normalizeDate('невалидна-дата')).toBe('невалидна-дата')
    })
  })

  describe('UploadPayloadSchema', () => {
    it('accepts valid JPEG data URL with valid base64 body', () => {
      const parsed = UploadPayloadSchema.safeParse({
        fileName: 'scan-01.jpg',
        fileBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      })
      expect(parsed.success).toBe(true)
    })

    it('rejects non-JPEG MIME prefix and corrupted base64 characters', () => {
      const pngAttempt = UploadPayloadSchema.safeParse({
        fileName: 'scan.png',
        fileBase64: 'data:image/png;base64,iVBORw0KGgo=',
      })
      expect(pngAttempt.success).toBe(false)

      const badBase64 = UploadPayloadSchema.safeParse({
        fileName: 'scan.jpg',
        fileBase64: 'data:image/jpeg;base64,$$not-base64$$',
      })
      expect(badBase64.success).toBe(false)
    })
  })

  describe('VisionOcrResultSchema & UpdateDocumentSchema', () => {
    it('rejects OCR result when date cannot be normalized to YYYY-MM-DD', () => {
      const badDate = VisionOcrResultSchema.safeParse({
        title_bg: 'Изследване',
        title_el: 'Εξέταση',
        doc_date: 'май 2024',
        category: 'Други',
        summary_el: 'Резюме',
        extracted_text: 'Текст',
      })
      expect(badDate.success).toBe(false)
    })

    it('validates UpdateDocumentSchema and coerces positive numeric ID', () => {
      const valid = UpdateDocumentSchema.safeParse({
        id: '15',
        titleBg: 'Епикриза',
        titleEl: 'Εξιτήριο',
        docDate: '2024-06-01',
        category: 'Епикризи',
        summaryEl: 'Клинично резюме',
        keyMarkers: ['CEA: 1.8'],
      })
      expect(valid.success).toBe(true)
      if (valid.success) {
        expect(valid.data.id).toBe(15)
      }
    })
  })
})

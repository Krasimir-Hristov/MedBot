import { describe, it, expect } from 'vitest'
import {
  CategoryPreviewItemSchema,
  PublishGuidelinesSchema,
  CreateManualGuidelineSchema,
  UpdateGuidelineSchema,
} from './schemas'

describe('Patient Guidelines - Zod Validation Schemas', () => {
  describe('CategoryPreviewItemSchema', () => {
    it('validates a correct category preview item', () => {
      const valid = {
        category: 'diet',
        titleBg: 'Хранене и прием на вода',
        titleEl: 'Διατροφή και ενυδάτωση',
        noteBg: 'Пийте поне 2 литра вода дневно.',
        noteEl: '• Πίνετε τουλάχιστον 2 λίτρα νερό ημερησίως.',
        approvedItemIds: [1, 2],
      }

      const parsed = CategoryPreviewItemSchema.safeParse(valid)
      expect(parsed.success).toBe(true)
    })

    it('rejects empty approvedItemIds array', () => {
      const invalid = {
        category: 'therapy',
        titleBg: 'Терапия',
        titleEl: 'Θεραπεία',
        noteBg: 'Вземайте лекарствата след храна.',
        noteEl: '• Πάρτε τα φάρμακα μετά το φαγητό.',
        approvedItemIds: [],
      }

      const parsed = CategoryPreviewItemSchema.safeParse(invalid)
      expect(parsed.success).toBe(false)
    })

    it('rejects invalid category enum value', () => {
      const invalid = {
        category: 'unknown-category',
        titleBg: 'Заглавие',
        titleEl: 'Τίτλος',
        noteBg: 'Бележка',
        noteEl: 'Σημείωση',
        approvedItemIds: [5],
      }

      const parsed = CategoryPreviewItemSchema.safeParse(invalid)
      expect(parsed.success).toBe(false)
    })

    it('rejects negative or non-integer item IDs', () => {
      const invalid = {
        category: 'general',
        titleBg: 'Общи',
        titleEl: 'Γενικά',
        noteBg: 'Почивка.',
        noteEl: '• Ανάπαυση.',
        approvedItemIds: [-1, 2.5],
      }

      const parsed = CategoryPreviewItemSchema.safeParse(invalid)
      expect(parsed.success).toBe(false)
    })
  })

  describe('PublishGuidelinesSchema', () => {
    it('validates publish payload with at least one item', () => {
      const payload = {
        items: [
          {
            category: 'exercise',
            titleBg: 'Упражнения',
            titleEl: 'Ασκήσεις',
            noteBg: 'Леки разходки.',
            noteEl: '• Ελαφρύ περπάτημα.',
            approvedItemIds: [10],
          },
        ],
        doctorName: 'Д-р Георгиев',
      }

      const parsed = PublishGuidelinesSchema.safeParse(payload)
      expect(parsed.success).toBe(true)
    })

    it('rejects publish payload with empty items array', () => {
      const payload = {
        items: [],
      }

      const parsed = PublishGuidelinesSchema.safeParse(payload)
      expect(parsed.success).toBe(false)
    })
  })

  describe('CreateManualGuidelineSchema', () => {
    it('validates manual guideline input', () => {
      const valid = {
        category: 'diet',
        textEl: 'Να αποφεύγονται τα πολύ αλμυρά τρόφιμα.',
      }
      expect(CreateManualGuidelineSchema.safeParse(valid).success).toBe(true)
    })

    it('rejects textEl with less than 2 characters', () => {
      const invalid = {
        category: 'diet',
        textEl: 'A',
      }
      expect(CreateManualGuidelineSchema.safeParse(invalid).success).toBe(false)
    })
  })

  describe('UpdateGuidelineSchema', () => {
    it('validates update with status transition', () => {
      const update = {
        id: 7,
        status: 'approved',
      }
      expect(UpdateGuidelineSchema.safeParse(update).success).toBe(true)
    })

    it('rejects non-positive ID', () => {
      const update = {
        id: -3,
        status: 'rejected',
      }
      expect(UpdateGuidelineSchema.safeParse(update).success).toBe(false)
    })
  })
})

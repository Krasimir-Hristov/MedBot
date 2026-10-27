import { describe, it, expect } from 'vitest'
import { extractCitations, formatDossierCatalogIndex, formatRetrievedMatches } from './rag-engine'
import type { DocumentCatalogItem, RagDocumentMatch } from '@/features/documents'

describe('RAG Engine - Citations & Context Formatting', () => {
  describe('extractCitations', () => {
    it('extracts single markdown document citation', () => {
      const text = 'Според последната епикриза [📄 Епикриза (2024-03-12)](/api/doc/42) пациентката е в ремисия.'
      const citations = extractCitations(text)

      expect(citations).toEqual([
        { id: 42, title: 'Епикриза (2024-03-12)' },
      ])
    })

    it('extracts multiple citations and deduplicates by document ID', () => {
      const text = `
        Първоначална диагноза: [📄 Биопсия (2023-10-01)](/api/doc/10).
        Контролен преглед: [📄 Скенер (2024-01-15)](/api/doc/11).
        Повторно цитиране на същия документ: [📄 Биопсия (2023-10-01)](/api/doc/10).
      `
      const citations = extractCitations(text)

      expect(citations).toHaveLength(2)
      expect(citations).toEqual([
        { id: 10, title: 'Биопсия (2023-10-01)' },
        { id: 11, title: 'Скенер (2024-01-15)' },
      ])
    })

    it('extracts Greek document citations properly', () => {
      const text = 'Σύμφωνα με την [📄 Ιστολογική Έκθεση (2023-11-05)](/api/doc/15) ο όγκος είναι IDC.'
      const citations = extractCitations(text)

      expect(citations).toEqual([
        { id: 15, title: 'Ιστολογική Έκθεση (2023-11-05)' },
      ])
    })

    it('returns empty array when content contains no citations', () => {
      const text = 'Няма цитирани документи в този отговор.'
      expect(extractCitations(text)).toEqual([])
    })
  })

  describe('formatDossierCatalogIndex', () => {
    it('returns fallback message when documents catalog is empty', () => {
      const result = formatDossierCatalogIndex([], 'bg')
      expect(result).toBe('Няма качени документи в досието / Δεν υπάρχουν έγγραφα στον φάκελο.')
    })

    it('sorts documents chronologically and uses locale-specific title', () => {
      const docs: DocumentCatalogItem[] = [
        {
          id: 2,
          docDate: '2024-05-10',
          titleBg: 'Скенер на гръден кош',
          titleEl: 'Αξονική τομογραφία θώρακος',
          category: 'Образна диагностика',
          summaryEl: 'Стабилен размер',
          keyMarkers: ['RECIST stable'],
          isVectorized: true,
          mimeType: 'image/jpeg',
          createdAt: '2024-05-10T10:00:00.000Z',
        },
        {
          id: 1,
          docDate: '2023-08-15',
          titleBg: 'Хистология',
          titleEl: 'Ιστολογική έκθεση',
          category: 'Хистология',
          summaryEl: 'IDC T2N1M0',
          keyMarkers: ['ER+', 'PR+'],
          isVectorized: true,
          mimeType: 'image/jpeg',
          createdAt: '2023-08-15T10:00:00.000Z',
        },
      ]

      const bgResult = formatDossierCatalogIndex(docs, 'bg')
      const elResult = formatDossierCatalogIndex(docs, 'el')

      // Should sort ID 1 (2023-08-15) before ID 2 (2024-05-10)
      const bgLines = bgResult.split('\n')
      expect(bgLines[0]).toContain('[ID: 1]')
      expect(bgLines[0]).toContain('Хистология')
      expect(bgLines[0]).toContain('[ER+, PR+]')
      expect(bgLines[1]).toContain('[ID: 2]')
      expect(bgLines[1]).toContain('Скенер на гръден кош')

      expect(elResult).toContain('Αξονική τομογραφία θώρακος')
    })
  })

  describe('formatRetrievedMatches', () => {
    it('returns fallback message when matches are empty', () => {
      const result = formatRetrievedMatches([], 'el')
      expect(result).toBe('Няма намерени сходни откъси / Δεν βρέθηκαν συναφή αποσπάσματα.')
    })

    it('formats clinical metadata and truncated extracted text for retrieved matches', () => {
      const matches: RagDocumentMatch[] = [
        {
          id: 101,
          titleBg: 'Епикриза',
          titleEl: 'Εξιτήριο',
          docDate: '2024-02-20',
          category: 'Епикризи',
          summaryEl: 'Успешна терапия',
          extractedText: 'Пълен текст на епикризата с резултати от изследвания.',
          similarity: 0.92,
          metadata: {
            staging: 'Stage IIB',
            keyMarkers: ['CA 15-3: 24'],
            criticalAlerts: [],
            hospital: 'СБАЛО',
          },
        },
      ]

      const result = formatRetrievedMatches(matches, 'bg')

      expect(result).toContain('ДОКУМЕНТ [ID: 101] (1/1):')
      expect(result).toContain('Заглавие: Епикриза')
      expect(result).toContain('Стадий/Στάδιο: Stage IIB')
      expect(result).toContain('Маркери/Δείκτες: CA 15-3: 24')
      expect(result).toContain('Болница/Νοσοκομείο: СБАЛО')
      expect(result).toContain('Пълен текст на епикризата')
    })
  })
})

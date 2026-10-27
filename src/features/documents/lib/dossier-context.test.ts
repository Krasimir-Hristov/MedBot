import { describe, it, expect } from 'vitest'
import { buildDossierContext } from './dossier-context'
import type { DossierSourceDocument } from '../types'

const makeDoc = (id: number, extractedText: string): DossierSourceDocument => ({
  id,
  titleBg: `Документ ${id}`,
  titleEl: `Έγγραφο ${id}`,
  docDate: `2024-0${id}-10`,
  category: 'Епикризи',
  summaryEl: `Клинично резюме за документ ${id}`,
  extractedText,
  metadata: {
    staging: 'Stage IIA',
    keyMarkers: [`CA 15-3: ${10 + id}`],
    criticalAlerts: ['Проследяване на костна плътност'],
    hospital: 'Клиника Тест',
  },
})

describe('Dossier Context - Water-Filling Token Allocation & Header Integrity', () => {
  it('keeps all documents un-truncated when total tokens fit within budget', () => {
    const docs = [
      makeDoc(1, 'Кратък OCR текст за първи документ.'),
      makeDoc(2, 'Кратък OCR текст за втори документ.'),
    ]

    const ctx = buildDossierContext(docs, 10_000)

    expect(ctx.truncatedDocCount).toBe(0)
    expect(ctx.text).toContain('=== ДОКУМЕНТ [ID: 1] ===')
    expect(ctx.text).toContain('=== ДОКУМЕНТ [ID: 2] ===')
    expect(ctx.text).toContain('Кратък OCR текст за първи документ.')
    expect(ctx.text).toContain('Кратък OCR текст за втори документ.')
  })

  it('redistributes unused budget from short docs to long docs via water-filling', () => {
    const shortDoc = makeDoc(1, 'Много кратък текст.')
    const mediumLongDoc = makeDoc(2, 'Детайлен клиничен запис. '.repeat(60))

    // Equal split would give < half budget to doc 2, but water-filling transfers surplus from doc 1
    const ctx = buildDossierContext([shortDoc, mediumLongDoc], 1500)

    expect(ctx.truncatedDocCount).toBe(0)
    expect(ctx.text).not.toContain('[… съкратено / περικομμένο …]')
  })

  it('truncates only oversized OCR body while keeping every clinical header 100% intact', () => {
    const shortDoc = makeDoc(1, 'Кратък текст без съкращаване.')
    const hugeDoc = makeDoc(
      2,
      'НАЧАЛО НА ЕПИКРИЗА ' + 'Подробни лабораторни стойности '.repeat(400) + ' ЗАКЛЮЧЕНИЕ В КРАЯ'
    )

    const ctx = buildDossierContext([shortDoc, hugeDoc], 700)

    expect(ctx.truncatedDocCount).toBe(1)
    // Both headers & markers remain completely intact
    expect(ctx.text).toContain('Стадий/Στάδιο: Stage IIA')
    expect(ctx.text).toContain('Маркери/Δείκτες: CA 15-3: 12')
    expect(ctx.text).toContain('Предупреждения/Προειδοποιήσεις: Проследяване на костна плътност')
    // Short doc intact, huge doc truncated preserving start & end
    expect(ctx.text).toContain('Кратък текст без съкращаване.')
    expect(ctx.text).toContain('НАЧАЛО НА ЕПИКРИЗА')
    expect(ctx.text).toContain('ЗАКЛЮЧЕНИЕ В КРАЯ')
    expect(ctx.text).toContain('[… съкратено / περικομμένο …]')
  })
})

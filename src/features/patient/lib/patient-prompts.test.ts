import { describe, it, expect } from 'vitest'
import { buildPatientSystemPrompt } from './patient-prompts'
import type { RagContextBundle, RagDoctorNoteMatch } from '@/features/rag'

const makeNote = (overrides: Partial<RagDoctorNoteMatch>): RagDoctorNoteMatch => ({
  id: 10,
  category: 'diet',
  titleBg: 'Хранителен режим',
  titleEl: 'Διατροφικές οδηγίες',
  noteBg: 'Приемайте поне 2 литра вода дневно.',
  noteEl: 'Πίνετε τουλάχιστον 2 λίτρα νερό ημερησίως.',
  doctorName: 'Д-р Специалист',
  attachmentName: 'diet.pdf',
  attachmentMime: 'application/pdf',
  hasAttachment: true,
  similarity: 0.91,
  createdAt: '2025-02-01T10:00:00.000Z',
  ...overrides,
})

describe('Patient System Prompt Builder - Deduplication, Safety & Bilingual Rules', () => {
  it('deduplicates overlapping recentDoctorNotes and matchedNotes and includes attachment link in BG', () => {
    const duplicateNote = makeNote({ id: 10, hasAttachment: true })
    const secondNote = makeNote({
      id: 11,
      category: 'therapy',
      titleBg: 'Терапия',
      noteBg: 'Продължете приема сутрин.',
      hasAttachment: false,
    })

    const bundle: RagContextBundle = {
      recentDoctorNotes: [duplicateNote],
      matchedNotes: [duplicateNote, secondNote],
      matchedDocuments: [],
    }

    const prompt = buildPatientSystemPrompt(bundle, 'bg')

    // Note #10 must appear only ONCE despite being in both recentDoctorNotes and matchedNotes
    const occurrences = prompt.match(/#10/g) ?? []
    expect(occurrences).toHaveLength(1)
    expect(prompt).toContain('[📎 Отвори прикачения документ](/api/notes/10/file)')
    expect(prompt).not.toContain('/api/notes/11/file')
    // Safety rule forbidding internal raw scan links /api/doc/... for patients
    expect(prompt).toContain('НИКОГА не включвайте препратки към вътрешни адреси като "/api/doc/..."')
  })

  it('builds full Greek prompt when locale is el with Greek attachment link', () => {
    const bundle: RagContextBundle = {
      recentDoctorNotes: [makeNote({ id: 22, hasAttachment: true })],
      matchedNotes: [],
      matchedDocuments: [],
    }

    const prompt = buildPatientSystemPrompt(bundle, 'el')

    expect(prompt).toContain('ΑΠΑΝΤΑΤΕ ΠΑΝΤΑ ΚΑΙ ΑΠΟΚΛΕΙΣΤΙΚΑ ΣΤΑ ΕΛΛΗΝΙΚΑ')
    expect(prompt).toContain('[📎 Άνοιγμα συνημμένου εγγράφου](/api/notes/22/file)')
    expect(prompt).toContain('ΠΟΤΕ μην βάζετε συνδέσμους της μορφής "/api/doc/..."')
  })
})

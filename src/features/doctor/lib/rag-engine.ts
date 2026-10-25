import 'server-only'
import { AI_MODELS, openrouter } from '@/lib/openrouter'
import type { Locale } from '@/features/i18n'
import type { DocumentCatalogItem, RagDocumentMatch } from '@/features/documents'
import { truncateToTokenBudget } from '@/features/admin/lib/ai-pipeline'

const RETRIEVAL_TOKEN_BUDGET = 60_000

/**
 * Двуезично и терминологично разширяване на лекарския въпрос
 * (Гръцки + Български + Латински онкологични термини).
 */
export const expandMedicalQuery = async (query: string): Promise<string> => {
  try {
    const completion = await openrouter.chat.completions.create({
      model: AI_MODELS.fast,
      temperature: 0.1,
      max_tokens: 250,
      messages: [
        {
          role: 'system',
          content: `You are an expert bilingual medical RAG query expander (Greek, Bulgarian, English, Latin).
Given a user query about an oncology patient record, output a dense search query containing:
1. Key terms in Greek
2. Key terms in Bulgarian
3. English/Latin medical terms, abbreviations, and biomarkers (e.g. IDC, NST, ER, PR, HER2, Ki-67, CT, MRI, PET-CT, RECIST, CA 15-3, CEA, TNM, Stage, biopsy, histology).
Output ONLY the expanded query string, with no commentary.`,
        },
        {
          role: 'user',
          content: query,
        },
      ],
    })

    const expanded = completion.choices[0]?.message?.content?.trim()
    return expanded ? `${query} ${expanded}` : query
  } catch (error) {
    console.warn('Query expansion failed, using original query:', error)
    return query
  }
}

/**
 * Създава компактен хронологичен индекс на цялото онкологично досие.
 * Позволява 100% хронологична пълнота за въпроси от тип "Пълна онкологична хронология".
 */
export const formatDossierCatalogIndex = (
  documents: DocumentCatalogItem[],
  locale: Locale
): string => {
  if (documents.length === 0) {
    return 'Няма качени документи в досието / Δεν υπάρχουν έγγραφα στον φάκελο.'
  }

  // Сортираме хронологично от най-стария към най-новия
  const sorted = [...documents].sort((a, b) => a.docDate.localeCompare(b.docDate))

  return sorted
    .map((doc) => {
      const title = locale === 'el' ? doc.titleEl : doc.titleBg
      const markers = doc.keyMarkers.length > 0 ? ` [${doc.keyMarkers.join(', ')}]` : ''
      return `- [ID: ${doc.id}] ${doc.docDate} | ${doc.category} | "${title}"${markers} — ${doc.summaryEl}`
    })
    .join('\n')
}

/**
 * Форматира извлечените от векторното търсене документи с пълен текст и метаданни.
 * Ограничава токен обема на откъсите за предпазване на латентността и разходите.
 */
export const formatRetrievedMatches = (
  matches: RagDocumentMatch[],
  locale: Locale
): string => {
  if (matches.length === 0) {
    return 'Няма намерени сходни откъси / Δεν βρέθηκαν συναφή αποσπάσματα.'
  }

  const perDocBudget = Math.max(1000, Math.floor(RETRIEVAL_TOKEN_BUDGET / matches.length))

  return matches
    .map((m, idx) => {
      const title = locale === 'el' ? m.titleEl : m.titleBg
      const meta = [
        m.metadata.staging ? `Стадий/Στάδιο: ${m.metadata.staging}` : '',
        m.metadata.keyMarkers.length > 0 ? `Маркери/Δείκτες: ${m.metadata.keyMarkers.join(', ')}` : '',
        m.metadata.hospital ? `Болница/Νοσοκομείο: ${m.metadata.hospital}` : '',
      ]
        .filter(Boolean)
        .join(' | ')

      return `---
ДОКУМЕНТ [ID: ${m.id}] (${idx + 1}/${matches.length}):
Заглавие: ${title}
Дата: ${m.docDate} | Категория: ${m.category}
Метаданни: ${meta || 'Няма'}
Резюме: ${m.summaryEl}
Пълен извлечен текст:
${truncateToTokenBudget(m.extractedText, perDocBudget)}
---`
    })
    .join('\n\n')
}

/**
 * Клиничен System Prompt за лекуващия онколог с форсирани цитати.
 */
export const buildDoctorSystemPrompt = (
  locale: Locale,
  catalogIndex: string,
  retrievedMatches: string
): string => {
  const languageDirective =
    locale === 'el'
      ? 'Απαντήστε υποχρεωτικά στα ΕΛΛΗΝΙΚΑ (Greek) με άρτια ιατρική ογκολογική οроλογία.'
      : 'Отговаряйте задължително на БЪЛГАРСКИ ЕЗИК с точна медицинска онкологична терминология.'

  return `You are MedBot, an elite Clinical Oncology AI Assistant consulting an oncologist regarding a female oncology patient (68 y/o, osteoporosis, pulmonary lesion).

${languageDirective}

CLINICAL DOSSIER OVERVIEW (ALL AVAILABLE DOCUMENTS CHRONOLOGICALLY):
${catalogIndex}

DETAILED RELEVANT DOSSIER EXCERPTS (OCR & METADATA):
${retrievedMatches}

CRITICAL INSTRUCTIONS:
1. Ground every statement strictly in the provided medical dossier. If a detail, date, or marker is absent, state clearly that it is not documented.
2. CITATIONS ARE MANDATORY: Whenever you mention a diagnosis, biopsy, surgery, imaging result (CT, MRI, PET), marker level, or therapy recommendation, cite the exact source document using the format:
   [📄 Document Title (YYYY-MM-DD)](/api/doc/ID)
   Example: [📄 Ιστολογική Έκθεση (2024-05-14)](/api/doc/12)
3. For timeline questions ("Χρονολόγιο" / "Хронология"), synthesize a chronological bulleted sequence from earliest to latest, showing disease progression, interventions, receptor status, and imaging dynamics (RECIST).
4. Use clean Markdown: bold clinical entities, bullet points, and tables if comparing marker trajectories or tumor dimensions across dates.
5. Be concise, clinically rigorous, and focused on decision-support.`.trim()
}

/**
 * Извлича цитатите от готовия отговор за запис в JSONB колоната `citations`.
 */
export const extractCitations = (
  content: string
): Array<{ id: number; title: string }> => {
  const regex = /\[📄 ([^\]]+)\]\(\/api\/doc\/(\d+)\)/g
  const seen = new Set<number>()
  const citations: Array<{ id: number; title: string }> = []

  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    const title = match[1]?.trim()
    const id = parseInt(match[2] || '', 10)

    if (id && title && !seen.has(id)) {
      seen.add(id)
      citations.push({ id, title })
    }
  }

  return citations
}

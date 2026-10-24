import 'server-only'
import { revalidatePath } from 'next/cache'
import { AI_MODELS, openrouter } from '@/lib/openrouter'
import { createEmbedding } from '@/features/rag'
import { createDoctorNote } from '@/features/doctor-notes/dal'
import { NOTE_CATEGORY_LABELS_BG, NOTE_CATEGORY_LABELS_EL } from '@/features/doctor-notes/constants'
import { markGuidelinesAsPublished } from '../dal'
import type { CategoryPreviewItem, PatientGuidelineItemEntity } from '../types'
import type { GuidelineCategory } from '../constants'

interface TranslationResult {
  title_bg: string
  title_el: string
  note_bg: string
}

const translateCategoryToBulgarian = async (
  category: GuidelineCategory,
  greekPoints: string[]
): Promise<TranslationResult> => {
  const fallbackTitleBg = NOTE_CATEGORY_LABELS_BG[category] || 'Препоръка'
  const fallbackTitleEl = NOTE_CATEGORY_LABELS_EL[category] || 'Οδηγία'
  const bulletTextEl = greekPoints.map((p) => `• ${p}`).join('\n')

  const prompt = `You are an expert bilingual medical translator.
Translate the following doctor's clinical guidelines from Greek to Bulgarian for an oncology patient and her family.
The tone must be warm, reassuring, crystal-clear, and simple to understand (plain Bulgarian, no confusing medical jargon). Format the Bulgarian text as clear bullet points.

Input points in Greek:
${bulletTextEl}

Return a JSON object:
{
  "title_bg": "Brief title in Bulgarian (e.g. 'Насоки за хранене')",
  "title_el": "Brief title in Greek (e.g. 'Οδηγίες διατροφής')",
  "note_bg": "Warm, simple bulleted instructions in Bulgarian for the patient"
}`

  try {
    const completion = await openrouter.chat.completions.create({
      model: AI_MODELS.chat,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw) as { title_bg?: string; title_el?: string; note_bg?: string }

    return {
      title_bg: parsed.title_bg || fallbackTitleBg,
      title_el: parsed.title_el || fallbackTitleEl,
      note_bg: parsed.note_bg || bulletTextEl,
    }
  } catch (err) {
    console.warn(`Translation fallback for category ${category}:`, err)
    return {
      title_bg: fallbackTitleBg,
      title_el: fallbackTitleEl,
      note_bg: bulletTextEl,
    }
  }
}

export const generatePublishPreview = async (
  approvedItems: PatientGuidelineItemEntity[]
): Promise<CategoryPreviewItem[]> => {
  // Group by category
  const grouped = new Map<GuidelineCategory, PatientGuidelineItemEntity[]>()
  for (const item of approvedItems) {
    const list = grouped.get(item.category) || []
    list.push(item)
    grouped.set(item.category, list)
  }

  const results: CategoryPreviewItem[] = []

  for (const [category, items] of grouped.entries()) {
    if (items.length === 0) continue
    const greekPoints = items.map((i) => i.textEl)
    const noteEl = greekPoints.map((p) => `• ${p}`).join('\n')
    const translation = await translateCategoryToBulgarian(category, greekPoints)

    results.push({
      category,
      titleBg: translation.title_bg,
      titleEl: translation.title_el,
      noteBg: translation.note_bg,
      noteEl,
      approvedItemIds: items.map((i) => i.id),
    })
  }

  return results
}

export const publishGuidelinesToPatient = async (
  previewItems: CategoryPreviewItem[],
  doctorName = 'Д-р Специалист'
): Promise<void> => {
  const allIds: number[] = []

  for (const item of previewItems) {
    allIds.push(...item.approvedItemIds)

    const semanticText = `Заглавие: ${item.titleBg} / ${item.titleEl}\nКатегория: ${item.category}\nЛекар: ${doctorName}\nПрепоръки за пациента (BG):\n${item.noteBg}\nΙατρικές οδηγίες (EL):\n${item.noteEl}`

    let embedding: number[] | undefined
    try {
      embedding = await createEmbedding(semanticText)
    } catch (err) {
      console.warn(`Could not create embedding for published note (${item.category}):`, err)
    }

    await createDoctorNote({
      category: item.category,
      titleBg: item.titleBg,
      titleEl: item.titleEl,
      noteBg: item.noteBg,
      noteEl: item.noteEl,
      doctorName,
      semanticText,
      embedding,
    })
  }

  if (allIds.length > 0) {
    await markGuidelinesAsPublished(allIds)
  }

  revalidatePath('/doctor')
  revalidatePath('/patient')
}

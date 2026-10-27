import 'server-only'
import { revalidatePath } from 'next/cache'
import { AI_MODELS, openrouter } from '@/lib/openrouter'
import { createEmbedding } from '@/features/rag'
import { NOTE_CATEGORY_LABELS_BG, NOTE_CATEGORY_LABELS_EL } from '@/features/doctor-notes/constants'
import {
  GuidelinePublishConflictError,
  getGuidelineItemsByIds,
  publishCategoryGuidelineNote,
} from '../dal'
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
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) {
      throw new Error('Empty translation response from AI model')
    }
    const parsed = JSON.parse(raw) as Partial<TranslationResult>
    const noteBg = typeof parsed.note_bg === 'string' ? parsed.note_bg.trim() : ''
    if (!noteBg) {
      throw new Error('Missing translated note_bg in AI response')
    }

    const titleBg =
      typeof parsed.title_bg === 'string' && parsed.title_bg.trim()
        ? parsed.title_bg.trim()
        : fallbackTitleBg
    const titleEl =
      typeof parsed.title_el === 'string' && parsed.title_el.trim()
        ? parsed.title_el.trim()
        : fallbackTitleEl

    return {
      title_bg: titleBg,
      title_el: titleEl,
      note_bg: noteBg,
    }
  } catch (error) {
    console.error(`Translation error for category ${category}:`, error)
    throw new Error('Неуспешен превод на насоките на български език.')
  }
}

export const generateCategoryPreviewList = async (
  approvedItems: PatientGuidelineItemEntity[]
): Promise<CategoryPreviewItem[]> => {
  const byCategory = new Map<GuidelineCategory, PatientGuidelineItemEntity[]>()

  for (const item of approvedItems) {
    const list = byCategory.get(item.category) || []
    list.push(item)
    byCategory.set(item.category, list)
  }

  const results: CategoryPreviewItem[] = []

  for (const [category, items] of byCategory.entries()) {
    const validItems = items
      .map((i) => ({ ...i, trimmedText: i.textEl.trim() }))
      .filter((i) => Boolean(i.trimmedText))
    if (validItems.length === 0) continue

    const greekPoints = validItems.map((i) => i.trimmedText)
    const noteEl = greekPoints.map((p) => `• ${p}`).join('\n')
    const translation = await translateCategoryToBulgarian(category, greekPoints)

    results.push({
      category,
      titleBg: translation.title_bg,
      titleEl: translation.title_el,
      noteBg: translation.note_bg,
      noteEl,
      approvedItemIds: validItems.map((i) => i.id),
    })
  }

  return results
}

export const publishGuidelinesToPatient = async (
  previewItems: CategoryPreviewItem[],
  doctorName = 'Д-р Специалист'
): Promise<void> => {
  const seenIds = new Set<number>()
  for (const item of previewItems) {
    if (item.approvedItemIds.length === 0 || !item.noteBg.trim()) {
      throw new GuidelinePublishConflictError()
    }
    for (const id of item.approvedItemIds) {
      if (seenIds.has(id)) {
        throw new GuidelinePublishConflictError()
      }
      seenIds.add(id)
    }
  }

  for (const item of previewItems) {
    const existingItems = await getGuidelineItemsByIds(item.approvedItemIds)
    const existingMap = new Map(existingItems.map((i) => [i.id, i]))
    if (existingMap.size !== item.approvedItemIds.length) {
      throw new GuidelinePublishConflictError()
    }

    let publishedCount = 0
    const expectedPoints: string[] = []
    for (const id of item.approvedItemIds) {
      const dbItem = existingMap.get(id)
      if (!dbItem || dbItem.category !== item.category || dbItem.status !== 'approved') {
        throw new GuidelinePublishConflictError()
      }
      if (dbItem.publishedAt !== null) {
        publishedCount += 1
      }
      const trimmed = dbItem.textEl.trim()
      if (!trimmed) {
        throw new GuidelinePublishConflictError()
      }
      expectedPoints.push(`• ${trimmed}`)
    }

    if (expectedPoints.join('\n') !== item.noteEl.trim()) {
      throw new GuidelinePublishConflictError()
    }

    if (publishedCount === item.approvedItemIds.length) {
      continue
    }
    if (publishedCount > 0) {
      throw new GuidelinePublishConflictError()
    }

    const semanticText = `Заглавие: ${item.titleBg} / ${item.titleEl}\nКатегория: ${item.category}\nЛекар: ${doctorName}\nПрепоръки за пациента (BG):\n${item.noteBg}\nΙατρικές οδηγίες (EL):\n${item.noteEl}`

    let embedding: number[] | undefined
    try {
      embedding = await createEmbedding(semanticText)
    } catch (err) {
      console.warn(`Could not create embedding for published note (${item.category}):`, err)
    }

    await publishCategoryGuidelineNote({
      approvedItemIds: item.approvedItemIds,
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

  revalidatePath('/doctor')
  revalidatePath('/patient')
}

export const generatePublishPreview = generateCategoryPreviewList

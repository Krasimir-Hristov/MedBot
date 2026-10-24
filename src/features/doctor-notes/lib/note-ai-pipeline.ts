import 'server-only'
import { AI_MODELS, openrouter } from '@/lib/openrouter'
import { createEmbedding } from '@/features/rag'
import type { NoteCategory } from '../constants'
import type { CreateDoctorNoteInput } from '../types'
import type { UploadPrescriptionPayload } from '../schemas'

export class NotePipelineError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 502
  ) {
    super(message)
    this.name = 'NotePipelineError'
  }
}

export const parseJsonResponse = (content: string): Record<string, unknown> => {
  const cleaned = content.replace(/```(?:json)?/gi, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw new NotePipelineError('AI моделът не върна структуриран отговор. Моля, опитайте отново.')
  }
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>
  } catch {
    throw new NotePipelineError('Невалиден JSON формат от AI модела.')
  }
}

/**
 * Обработва текстова или диктувана лекарска бележка (на гръцки или български)
 */
export const processTextNoteAI = async (
  rawText: string,
  preferredCategory: NoteCategory,
  doctorName = 'Д-р Специалист'
): Promise<CreateDoctorNoteInput> => {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new NotePipelineError('AI услугата не е конфигурирана.', 500)
  }

  const systemPrompt = `You are a bilingual medical assistant for an oncology patient communication platform.
A doctor provided a clinical note/instruction (in Greek, Bulgarian, or English).
Translate and format it into JSON:
{
  "title_bg": "Кратко заглавие на български (напр. 'Препоръка за диета', 'Контролен скенер')",
  "title_el": "Short title in professional Greek (e.g. 'Οδηγία διατροφής')",
  "note_bg": "Warm, reassuring, crystal-clear instructions in Bulgarian for the patient and their family. Plain language, no confusing jargon.",
  "note_el": "Professional medical Greek transcription / translation for the treating doctor.",
  "category": "One of: 'general', 'therapy', 'diet', 'exercise'"
}
Category rule: if user specified "${preferredCategory}", keep it unless the text is explicitly about another category. Output only valid JSON.`

  try {
    const completion = await openrouter.chat.completions.create({
      model: AI_MODELS.chat,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: rawText },
      ],
    })

    const content = completion.choices[0]?.message?.content || ''
    const json = parseJsonResponse(content)

    const titleBg = String(json.title_bg || 'Лекарска препоръка').trim()
    const titleEl = String(json.title_el || 'Ιατρική οδηγία').trim()
    const noteBg = String(json.note_bg || rawText).trim()
    const noteEl = String(json.note_el || rawText).trim()
    const category = (['general', 'therapy', 'diet', 'exercise'].includes(String(json.category))
      ? String(json.category)
      : preferredCategory) as NoteCategory

    const semanticText = `Заглавие: ${titleBg} / ${titleEl}\nКатегория: ${category}\nЛекар: ${doctorName}\nПрепоръка (BG): ${noteBg}\nОδηγία (EL): ${noteEl}`
    const embedding = await createEmbedding(semanticText)

    return {
      category,
      titleBg,
      titleEl,
      noteBg,
      noteEl,
      doctorName,
      semanticText,
      embedding,
    }
  } catch (error) {
    console.error('Failed to process text note with AI:', error)
    throw new NotePipelineError('Грешка при обработката и превода на лекарската бележка.')
  }
}

/**
 * Обработва качен PDF или графичен файл с предписания от лекаря
 */
export const processPrescriptionFileAI = async (
  payload: UploadPrescriptionPayload
): Promise<CreateDoctorNoteInput> => {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new NotePipelineError('AI услугата не е конфигурирана.', 500)
  }

  const { fileBase64, mimeType, fileName, category: preferredCategory, doctorNote, doctorName } = payload

  const systemPrompt = `You are a clinical document specialist analyzing an oncology doctor's prescription, diet plan, exercise guide, or therapy protocol (PDF or Image).
Extract the information and return EXACTLY ONE JSON object:
{
  "title_bg": "Кратко ясно заглавие на български (напр. 'Хранителен режим при химиотерапия')",
  "title_el": "Short title in professional Greek (e.g. 'Διατροφικό πρόγραμμα')",
  "note_bg": "Detailed, empathetic, easy-to-follow patient instructions in Bulgarian, explaining what the patient should do step-by-step.",
  "note_el": "Medical summary in Greek for the oncology record.",
  "category": "One of: 'therapy', 'diet', 'exercise', 'general'",
  "extracted_text": "Full OCR/transcription text in original language"
}
Output only valid JSON.`

  const userText = `File name: "${fileName}". ${doctorNote ? `Doctor note: "${doctorNote}"` : ''}`

  let contentBlocks: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
    | { type: 'file'; file: { filename: string; file_data: string } }
  > = []

  if (mimeType.startsWith('image/')) {
    const dataUrl = fileBase64.startsWith('data:') ? fileBase64 : `data:${mimeType};base64,${fileBase64}`
    contentBlocks = [
      { type: 'text', text: userText },
      { type: 'image_url', image_url: { url: dataUrl } },
    ]
  } else {
    // PDF файл през OpenRouter
    const dataUrl = fileBase64.startsWith('data:') ? fileBase64 : `data:${mimeType};base64,${fileBase64}`
    contentBlocks = [
      { type: 'text', text: userText },
      { type: 'file', file: { filename: fileName, file_data: dataUrl } },
    ]
  }

  try {
    const completion = await openrouter.chat.completions.create({
      model: AI_MODELS.vision,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: contentBlocks as unknown as string,
        },
      ],
      plugins: mimeType === 'application/pdf' ? [{ id: 'file-parser', pdf: { engine: 'cloudflare-ai' } }] : undefined,
    } as unknown as Parameters<typeof openrouter.chat.completions.create>[0])

    const textContent =
      completion && 'choices' in completion
        ? completion.choices[0]?.message?.content || ''
        : ''
    const json = parseJsonResponse(textContent)

    const titleBg = String(json.title_bg || fileName).trim()
    const titleEl = String(json.title_el || fileName).trim()
    const noteBg = String(json.note_bg || doctorNote || 'Приложен е нов медицински документ.').trim()
    const noteEl = String(json.note_el || doctorNote || 'Επισυνάπτεται νέο ιατρικό έγγραφο.').trim()
    const extractedText = String(json.extracted_text || '').trim()
    const category = (['general', 'therapy', 'diet', 'exercise'].includes(String(json.category))
      ? String(json.category)
      : preferredCategory) as NoteCategory

    const semanticText = `Заглавие: ${titleBg} / ${titleEl}\nКатегория: ${category}\nЛекар: ${doctorName}\nФайл: ${fileName}\nИнструкции (BG): ${noteBg}\nОδηγία (EL): ${noteEl}\nТекст: ${extractedText}`
    const embedding = await createEmbedding(semanticText)

    return {
      category,
      titleBg,
      titleEl,
      noteBg,
      noteEl,
      doctorName,
      attachmentBase64: fileBase64,
      attachmentMime: mimeType,
      attachmentName: fileName,
      extractedText,
      semanticText,
      embedding,
    }
  } catch (error) {
    console.error('Failed to process prescription file with AI:', error)
    throw new NotePipelineError('Грешка при разчитането и превода на прикачения медицински файл.')
  }
}

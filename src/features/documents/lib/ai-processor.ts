import 'server-only'
import { z } from 'zod'
import { AI_MODELS, openrouter } from '@/lib/openrouter'
import {
  createMedicalDocument,
} from '../dal'
import type {
  CreateMedicalDocumentInput,
  DocumentCategory,
  DocumentClinicalMetadata,
  IngestDocumentInput,
  IngestDocumentResult,
} from '../types'
import {
  buildBilingualSemanticText,
  createMedicalEmbedding,
} from '@/features/admin/lib/ai-pipeline'
import { db } from '@/lib/db'
import { doctorNotes } from '@/lib/db/schema'

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

const ExtractedJsonSchema = z.object({
  title_bg: z.string().trim().min(1).max(300),
  title_el: z.string().trim().min(1).max(300),
  doc_date: z.string().regex(ISO_DATE_REGEX).optional().catch(undefined),
  category: z.string().trim().catch('Други'),
  summary_el: z.string().trim().min(1).max(3000),
  patient_summary_bg: z.string().trim().optional().default(''),
  is_prescription_or_guidance: z.boolean().optional().default(false),
  key_markers: z.array(z.string().trim()).nullish().transform((v) => v ?? []),
  staging: z.string().trim().nullish(),
  hospital: z.string().trim().nullish(),
  doctor: z.string().trim().nullish(),
  critical_alerts: z.array(z.string().trim()).nullish().transform((v) => v ?? []),
  extracted_text: z.string().trim().min(1),
})

const parseJsonObject = (raw: string): unknown => {
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw new Error('Моделът не върна валиден JSON отговор.')
  }
  return JSON.parse(cleaned.slice(start, end + 1))
}

const buildMultimodalPrompt = (fallbackDate: string): string => `
You are a senior clinical oncologist analyzing a medical record or prescription (image or PDF).
Language may be Bulgarian, Greek, English, or Latin.
Return EXACTLY ONE JSON object with no markdown:
{
  "title_bg": "кратко заглавие на български (напр. Епикриза, Рецепта за терапия, Хистология)",
  "title_el": "ίδιος τίτλος στα ελληνικά (π.χ. Ιστολογική Έκθεση, Συνταγή Θεραπείας)",
  "doc_date": "YYYY-MM-DD (ако липсва: ${fallbackDate})",
  "category": "Хистология | Образна диагностика | Туморни маркери | Епикризи | Лабораторни изследвания | Други",
  "summary_el": "3-6 sentences in professional medical Greek for the doctor: diagnosis, staging, therapy details, markers, recommendations",
  "patient_summary_bg": "топло, емпатично и ясно резюме на разбираем български език за пациента и семейството (какво означава документът, какви са предписанията за прием на лекарства, диета или упражнения)",
  "is_prescription_or_guidance": boolean (true if therapy protocol, diet, exercise, or prescription from doctor),
  "key_markers": ["ER (+) 85%", "Ki-67: 35%", ...],
  "staging": "TNM / стадий или null",
  "hospital": "болница или null",
  "doctor": "лекар или null",
  "critical_alerts": ["критични отклонения или прогресия"],
  "extracted_text": "пълен дословен транскрипт на документа"
}
`.trim()

/**
 * Извлича структурирани данни, генерира вектор и записва документ в Neon PostgreSQL.
 * При качване от лекар, ако документът е предписание или autoCreatePatientNote е true,
 * автоматично създава и преведена бележка за пациента в `doctor_notes`.
 */
export const processAndStoreDocument = async (
  input: IngestDocumentInput
): Promise<IngestDocumentResult> => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const rawBase64 = input.fileBase64.includes(',')
      ? input.fileBase64.split(',')[1]
      : input.fileBase64

    const isPdf = input.mimeType === 'application/pdf'

    // Съдържание за OpenRouter чат комплишън
    type ChatContentPart =
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
      | { type: 'file'; file: { filename: string; file_data: string } }

    const contentParts: ChatContentPart[] = [
      {
        type: 'text',
        text: `Моля, анализирайте този медицински файл: ${input.fileName || 'document'}`,
      },
    ]

    if (isPdf) {
      contentParts.push({
        type: 'file',
        file: {
          filename: input.fileName || 'document.pdf',
          file_data: `data:application/pdf;base64,${rawBase64}`,
        },
      })
    } else {
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: `data:${input.mimeType};base64,${rawBase64}`,
        },
      })
    }

    const completion = await openrouter.chat.completions.create({
      model: AI_MODELS.vision,
      temperature: 0,
      max_tokens: 16000,
      reasoning_effort: 'low',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildMultimodalPrompt(today) },
        { role: 'user', content: contentParts as unknown as string },
      ],
    })

    const rawContent = completion.choices[0]?.message?.content ?? ''
    const parsedData = ExtractedJsonSchema.parse(parseJsonObject(rawContent))
    const docDate = parsedData.doc_date || today

    const clinicalMeta: DocumentClinicalMetadata = {
      hospital: parsedData.hospital ?? undefined,
      doctor: parsedData.doctor ?? undefined,
      staging: parsedData.staging ?? undefined,
      keyMarkers: parsedData.key_markers,
      criticalAlerts: parsedData.critical_alerts,
    }

    const validCategory: DocumentCategory = (
      [
        'Хистология',
        'Образна диагностика',
        'Туморни маркери',
        'Епикризи',
        'Лабораторни изследвания',
      ].includes(parsedData.category)
        ? parsedData.category
        : 'Други'
    ) as DocumentCategory

    // Семантичен текст и вектор
    const semanticText = buildBilingualSemanticText({
      titleBg: parsedData.title_bg,
      titleEl: parsedData.title_el,
      docDate,
      category: validCategory,
      summaryEl: parsedData.summary_el,
      metadata: clinicalMeta,
      extractedText: parsedData.extracted_text,
    })

    const embedding = await createMedicalEmbedding(semanticText)

    // Запис в medical_documents
    const documentInput: CreateMedicalDocumentInput = {
      titleBg: parsedData.title_bg,
      titleEl: parsedData.title_el,
      docDate,
      category: validCategory,
      summaryEl: parsedData.summary_el,
      metadata: clinicalMeta,
      extractedText: parsedData.extracted_text,
      semanticText,
      embedding,
      fileBase64: input.fileBase64,
      mimeType: input.mimeType,
    }

    const createdDoc = await createMedicalDocument(documentInput)

    let patientNoteCreated = false
    let patientNoteId: number | undefined

    // Ако е качено от лекар и има препоръка/предписание за пациента:
    const shouldCreateNote =
      input.uploadedByRole === 'doctor' &&
      (input.autoCreatePatientNote !== false || parsedData.is_prescription_or_guidance) &&
      parsedData.patient_summary_bg.length > 0

    if (shouldCreateNote) {
      const noteResult = await db
        .insert(doctorNotes)
        .values({
          noteEl: parsedData.summary_el,
          noteBg: parsedData.patient_summary_bg,
          doctorName: parsedData.doctor || 'Д-р Специалист',
        })
        .returning({ id: doctorNotes.id })

      if (noteResult[0]) {
        patientNoteCreated = true
        patientNoteId = noteResult[0].id
      }
    }

    return {
      document: createdDoc,
      patientNoteCreated,
      patientNoteId,
    }
  } catch (error) {
    console.error('Error in processAndStoreDocument:', error)
    throw new Error('Грешка при обработка и запис на медицинския документ.')
  }
}

'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import {
  deleteMedicalDocument,
  getDocumentDetailById,
  updateMedicalDocument,
} from '@/features/documents'
import { isAdminSession } from './lib/guard'
import {
  buildBilingualSemanticText,
  createMedicalEmbedding,
  PipelineError,
} from './lib/ai-pipeline'
import { DocumentIdSchema, UpdateDocumentSchema } from './schemas'
import type {
  ActionResult,
  DocumentDetailResult,
  DocumentMutationResult,
  ShareLinkResult,
} from './types'

const FORBIDDEN: ActionResult<never> = {
  success: false,
  error: 'Нямате права за тази операция.',
}

const GENERIC_ERROR = 'Възникна системна грешка. Моля, опитайте отново.'

/**
 * Връща текст за споделяне с лекаря (URL към портала + ПИН).
 * ПИН кодът остава само на сървъра и се предава единствено след проверка на админ сесията.
 */
export const getDoctorShareLinkAction = async (): Promise<ShareLinkResult> => {
  try {
    if (!(await isAdminSession())) {
      return FORBIDDEN
    }

    const doctorPin = process.env.DOCTOR_PIN
    if (!doctorPin) {
      return { success: false, error: 'ПИН кодът за лекар не е конфигуриран.' }
    }

    const headersList = await headers()
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
    const host = headersList.get('host')
    const protocol = headersList.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
    const origin = host ? `${protocol}://${host}` : (configuredUrl ?? '')

    const text = [
      'MedScan RAG – достъп за лекаря / Πρόσβαση ιατρού',
      `URL: ${origin}/doctor`,
      `PIN: ${doctorPin}`,
    ].join('\n')

    return { success: true, data: { text } }
  } catch (error) {
    console.error('getDoctorShareLinkAction error:', error)
    return { success: false, error: GENERIC_ERROR }
  }
}

export const getDocumentDetailAction = async (id: number): Promise<DocumentDetailResult> => {
  try {
    if (!(await isAdminSession())) {
      return FORBIDDEN
    }

    const parsedId = DocumentIdSchema.safeParse(id)
    if (!parsedId.success) {
      return { success: false, error: 'Невалиден документ.' }
    }

    const detail = await getDocumentDetailById(parsedId.data)
    if (!detail) {
      return { success: false, error: 'Документът не е намерен.' }
    }
    return { success: true, data: detail }
  } catch (error) {
    console.error('getDocumentDetailAction error:', error)
    return { success: false, error: GENERIC_ERROR }
  }
}

/**
 * Обновява метаданните на документ и преизчислява семантичния текст и вектора,
 * за да остане RAG търсенето точно.
 */
export const updateDocumentAction = async (payload: unknown): Promise<DocumentMutationResult> => {
  try {
    if (!(await isAdminSession())) {
      return FORBIDDEN
    }

    const parsed = UpdateDocumentSchema.safeParse(payload)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Невалидни данни.' }
    }
    const input = parsed.data

    const existing = await getDocumentDetailById(input.id)
    if (!existing) {
      return { success: false, error: 'Документът не е намерен.' }
    }

    const metadata = {
      hospital: existing.hospital,
      doctor: existing.doctor,
      staging: existing.staging,
      keyMarkers: input.keyMarkers,
      criticalAlerts: existing.criticalAlerts,
    }

    const semanticText = buildBilingualSemanticText({
      titleBg: input.titleBg,
      titleEl: input.titleEl,
      docDate: input.docDate,
      category: input.category,
      summaryEl: input.summaryEl,
      metadata,
      extractedText: existing.extractedText,
    })
    const embedding = await createMedicalEmbedding(semanticText)

    const updated = await updateMedicalDocument(input.id, {
      titleBg: input.titleBg,
      titleEl: input.titleEl,
      docDate: input.docDate,
      category: input.category,
      summaryEl: input.summaryEl,
      metadata,
      semanticText,
      embedding,
    })

    if (!updated) {
      return { success: false, error: 'Документът не е намерен.' }
    }

    revalidatePath('/admin')
    return { success: true, data: updated }
  } catch (error) {
    if (error instanceof PipelineError) {
      return { success: false, error: error.message }
    }
    console.error('updateDocumentAction error:', error)
    return { success: false, error: GENERIC_ERROR }
  }
}

export const deleteDocumentAction = async (id: number): Promise<ActionResult<{ id: number }>> => {
  try {
    if (!(await isAdminSession())) {
      return FORBIDDEN
    }

    const parsedId = DocumentIdSchema.safeParse(id)
    if (!parsedId.success) {
      return { success: false, error: 'Невалиден документ.' }
    }

    const deleted = await deleteMedicalDocument(parsedId.data)
    if (!deleted) {
      return { success: false, error: 'Документът не е намерен.' }
    }

    revalidatePath('/admin')
    return { success: true, data: { id: parsedId.data } }
  } catch (error) {
    console.error('deleteDocumentAction error:', error)
    return { success: false, error: GENERIC_ERROR }
  }
}

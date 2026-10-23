import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { medicalDocuments } from '@/lib/db/schema'
import { DocumentBinaryData } from './types'

/**
 * Извлича бинарните данни и mime-type на документ по ID.
 * Оптимизирано да връща само нужните полета (без тежки вектори и текстове),
 * с цел минимален мрежов трафик (Egress optimization).
 */
export const getDocumentBinaryById = async (
  documentId: number
): Promise<DocumentBinaryData | null> => {
  try {
    const result = await db
      .select({
        id: medicalDocuments.id,
        fileBase64: medicalDocuments.fileBase64,
        mimeType: medicalDocuments.mimeType,
        titleBg: medicalDocuments.titleBg,
      })
      .from(medicalDocuments)
      .where(eq(medicalDocuments.id, documentId))
      .limit(1)

    if (!result || result.length === 0) {
      return null
    }

    return result[0]
  } catch (error) {
    console.error(`Error fetching document binary with ID ${documentId}:`, error)
    throw new Error('Грешка при четене на документа от базата данни.')
  }
}

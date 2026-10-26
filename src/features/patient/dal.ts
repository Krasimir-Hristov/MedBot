import 'server-only'
import { asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { chatMessages, chatSessions, medicalDocuments } from '@/lib/db/schema'
import type { ChatSession } from '@/lib/db/schema'
import { getDoctorNotesList, getLatestDoctorNotesByCategory } from '@/features/doctor-notes/dal'
import { PATIENT_DEFAULT_SESSION_ID } from './constants'
import type { PatientChatMessage, PatientPortalData } from './types'

/**
 * Връща списък с всички чат сесии на пациента
 */
export const getPatientChatSessions = async (): Promise<ChatSession[]> => {
  try {
    return await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.role, 'patient'))
      .orderBy(desc(chatSessions.updatedAt))
  } catch (error) {
    console.error('Error fetching patient chat sessions:', error)
    return []
  }
}

/**
 * Създава нова сесия за пациента
 */
export const createPatientChatSession = async (title = 'Нов разговор'): Promise<ChatSession> => {
  try {
    const sessionId = crypto.randomUUID()
    const rows = await db
      .insert(chatSessions)
      .values({
        sessionId,
        title,
        role: 'patient',
      })
      .returning()

    if (!rows[0]) {
      throw new Error('Insert returned no rows')
    }
    return rows[0]
  } catch (error) {
    console.error('Error creating patient chat session:', error)
    throw new Error('Грешка при създаване на чат сесия.')
  }
}

/**
 * Преименува сесия
 */
export const renamePatientChatSession = async (
  sessionId: string,
  title: string
): Promise<ChatSession> => {
  try {
    const rows = await db
      .update(chatSessions)
      .set({ title, updatedAt: new Date() })
      .where(eq(chatSessions.sessionId, sessionId))
      .returning()

    if (!rows[0]) {
      throw new Error('Session not found')
    }
    return rows[0]
  } catch (error) {
    console.error('Error renaming patient chat session:', error)
    throw new Error('Грешка при преименуване на чат сесията.')
  }
}

/**
 * Изтрива сесия и съобщенията в нея (чрез cascade)
 */
export const deletePatientChatSession = async (sessionId: string): Promise<void> => {
  try {
    await db.delete(chatSessions).where(eq(chatSessions.sessionId, sessionId))
  } catch (error) {
    console.error('Error deleting patient chat session:', error)
    throw new Error('Грешка при изтриване на чат сесията.')
  }
}

/**
 * Намира или създава основната активна сесия за пациента
 */
export const getOrCreateActivePatientSession = async (): Promise<string> => {
  try {
    const existing = await db
      .select({ sessionId: chatSessions.sessionId })
      .from(chatSessions)
      .where(eq(chatSessions.role, 'patient'))
      .orderBy(desc(chatSessions.updatedAt))
      .limit(1)

    if (existing[0]?.sessionId) {
      return existing[0].sessionId
    }

    const newId = PATIENT_DEFAULT_SESSION_ID
    await db.insert(chatSessions).values({
      sessionId: newId,
      role: 'patient',
      title: 'Разговор с MedBot',
    })

    return newId
  } catch (error) {
    console.error('Error getting/creating patient session:', error)
    return PATIENT_DEFAULT_SESSION_ID
  }
}

/**
 * Зарежда съобщенията от конкретен разговор
 */
export const getPatientChatMessages = async (sessionId: string): Promise<PatientChatMessage[]> => {
  try {
    const rows = await db
      .select({
        id: chatMessages.id,
        role: chatMessages.role,
        content: chatMessages.content,
        citations: chatMessages.citations,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt))
      .limit(100)

    return rows.map((r) => ({
      id: r.id,
      role: r.role as 'user' | 'assistant',
      content: r.content,
      citations: Array.isArray(r.citations) ? (r.citations as Array<{ id: number; title: string }>) : [],
      createdAt: r.createdAt.toISOString(),
    }))
  } catch (error) {
    console.error('Error fetching patient chat messages:', error)
    return []
  }
}

/**
 * Записва въпрос и отговор в разговора
 */
export const savePatientChatTurn = async (
  sessionId: string,
  userText: string,
  assistantText: string,
  citations: Array<{ id: number; title: string }> = []
): Promise<void> => {
  try {
    await db.insert(chatMessages).values([
      {
        sessionId,
        role: 'user',
        content: userText,
      },
      {
        sessionId,
        role: 'assistant',
        content: assistantText,
        citations,
      },
    ])

    await db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.sessionId, sessionId))
  } catch (error) {
    console.error('Error saving patient chat turn:', error)
  }
}

/**
 * Изчиства разговора (бутон "Нов разговор")
 */
export const resetPatientChatSession = async (sessionId: string): Promise<string> => {
  try {
    await db.delete(chatMessages).where(eq(chatMessages.sessionId, sessionId))
    await db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.sessionId, sessionId))
    return sessionId
  } catch (error) {
    console.error('Error resetting patient chat session:', error)
    return sessionId
  }
}

/**
 * Зарежда всички начални данни за портала на пациента в един паралелен Promise.all
 */
export const getPatientPortalData = async (): Promise<PatientPortalData> => {
  try {
    const [sessions, notesList, notesByCategory, docStats] = await Promise.all([
      getPatientChatSessions(),
      getDoctorNotesList(1),
      getLatestDoctorNotesByCategory(),
      db
        .select({
          count: sql<number>`count(*)::int`,
          latestDate: sql<string>`max(${medicalDocuments.docDate})`,
        })
        .from(medicalDocuments),
    ])

    let activeSession = sessions[0]
    let allSessions = sessions

    if (!activeSession) {
      activeSession = await createPatientChatSession('Разговор с MedBot')
      allSessions = [activeSession]
    }

    const messages = await getPatientChatMessages(activeSession.sessionId)

    const latestDocDate = docStats[0]?.latestDate
    const totalCount = docStats[0]?.count ?? 0

    return {
      latestNote: notesList[0] ?? null,
      notesByCategory,
      stats: {
        totalDocuments: totalCount,
        latestDocumentDate: latestDocDate || undefined,
      },
      activeSessionId: activeSession.sessionId,
      sessions: allSessions,
      messages,
    }
  } catch (error) {
    console.error('Error loading patient portal initial data:', error)
    return {
      latestNote: null,
      notesByCategory: {},
      stats: { totalDocuments: 0 },
      activeSessionId: PATIENT_DEFAULT_SESSION_ID,
      sessions: [],
      messages: [],
    }
  }
}


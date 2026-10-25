import 'server-only'
import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { chatMessages, chatSessions } from '@/lib/db/schema'
import type { ChatMessage, ChatSession } from '@/lib/db/schema'

export interface SessionWithLastMessage extends ChatSession {
  lastMessageSnippet?: string
}

export const getDoctorChatSessions = async (): Promise<ChatSession[]> => {
  try {
    return await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.role, 'doctor'))
      .orderBy(desc(chatSessions.updatedAt))
  } catch (error) {
    console.error('Error fetching doctor chat sessions:', error)
    throw new Error('Грешка при зареждане на чат сесиите.')
  }
}

export const getChatSession = async (sessionId: string): Promise<ChatSession | null> => {
  try {
    const rows = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.sessionId, sessionId))
      .limit(1)

    return rows[0] || null
  } catch (error) {
    console.error(`Error fetching chat session ${sessionId}:`, error)
    throw new Error('Грешка при извличане на чат сесията.')
  }
}

export const getChatMessages = async (sessionId: string): Promise<ChatMessage[]> => {
  try {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt))
  } catch (error) {
    console.error(`Error fetching chat messages for session ${sessionId}:`, error)
    throw new Error('Грешка при зареждане на съобщенията.')
  }
}

export const createChatSession = async (
  sessionId: string,
  title: string,
  role = 'doctor'
): Promise<ChatSession> => {
  try {
    const rows = await db
      .insert(chatSessions)
      .values({
        sessionId,
        title,
        role,
      })
      .returning()

    if (!rows[0]) {
      throw new Error('Insert returned no rows')
    }
    return rows[0]
  } catch (error) {
    console.error('Error creating chat session:', error)
    throw new Error('Грешка при създаване на чат сесия.')
  }
}

export const updateChatSessionTitle = async (
  sessionId: string,
  title: string,
  role = 'doctor'
): Promise<ChatSession | null> => {
  try {
    const rows = await db
      .update(chatSessions)
      .set({
        title,
        updatedAt: new Date(),
      })
      .where(
        role
          ? and(eq(chatSessions.sessionId, sessionId), eq(chatSessions.role, role))
          : eq(chatSessions.sessionId, sessionId)
      )
      .returning()

    return rows[0] || null
  } catch (error) {
    console.error(`Error updating chat session title ${sessionId}:`, error)
    throw new Error('Грешка при преименуване на сесията.')
  }
}

export const deleteChatSession = async (
  sessionId: string,
  role = 'doctor'
): Promise<boolean> => {
  try {
    const rows = await db
      .delete(chatSessions)
      .where(
        role
          ? and(eq(chatSessions.sessionId, sessionId), eq(chatSessions.role, role))
          : eq(chatSessions.sessionId, sessionId)
      )
      .returning({ sessionId: chatSessions.sessionId })

    return rows.length > 0
  } catch (error) {
    console.error(`Error deleting chat session ${sessionId}:`, error)
    throw new Error('Грешка при изтриване на сесията.')
  }
}

export const addChatMessage = async (data: {
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  citations?: Array<{ id: number; title: string }>
}): Promise<ChatMessage> => {
  try {
    // 1. Записваме съобщението
    const rows = await db
      .insert(chatMessages)
      .values({
        sessionId: data.sessionId,
        role: data.role,
        content: data.content,
        citations: data.citations || [],
      })
      .returning()

    // 2. Обновяваме updatedAt на сесията
    await db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.sessionId, data.sessionId))

    if (!rows[0]) {
      throw new Error('Insert message returned no rows')
    }
    return rows[0]
  } catch (error) {
    console.error('Error adding chat message:', error)
    throw new Error('Грешка при запис на чат съобщението.')
  }
}

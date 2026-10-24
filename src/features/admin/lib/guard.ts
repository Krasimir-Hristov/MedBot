import 'server-only'
import { getSession } from '@/features/auth/lib/session'

/**
 * Defense in Depth: проверка на администраторската роля на ниво Route Handler / Server Action,
 * независимо от защитата в `proxy.ts`.
 */
export const isAdminSession = async (): Promise<boolean> => {
  const session = await getSession()
  return session?.role === 'admin'
}

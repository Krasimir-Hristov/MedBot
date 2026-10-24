/**
 * Извлича тайния ключ за подписване и верификация на JWT сесии.
 * Няма хардкоднат fallback – изисква валиден SESSION_SECRET от минимум 32 символа.
 */
export const getSecretKey = (): Uint8Array => {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET environment variable is missing or shorter than 32 characters.')
  }
  return new TextEncoder().encode(secret)
}

import type { NextRequest } from 'next/server'

export class PayloadTooLargeError extends Error {
  constructor(message = 'Payload Too Large') {
    super(message)
    this.name = 'PayloadTooLargeError'
  }
}

/**
 * Чете тялото на входящата заявка с твърд лимит в байтове.
 * Предпазва от DoS и препълване на паметта при chunked transfer encoding
 * или манипулиран/липсващ Content-Length хедър.
 */
export const readBoundedJson = async <T = unknown>(
  request: NextRequest,
  maxBytes: number
): Promise<T> => {
  // 1. Предварителна проверка по Content-Length (ако е наличен)
  const contentLength = request.headers.get('content-length')
  if (contentLength) {
    const declaredBytes = parseInt(contentLength, 10)
    if (!isNaN(declaredBytes) && declaredBytes > maxBytes) {
      throw new PayloadTooLargeError(`Payload exceeds limit of ${maxBytes} bytes`)
    }
  }

  // 2. Проверка за налично тяло
  if (!request.body) {
    throw new Error('Липсва тяло на заявката.')
  }

  // 3. Поточно прочитане с брояч на реално постъпилите байтове
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        totalBytes += value.byteLength
        if (totalBytes > maxBytes) {
          await reader.cancel().catch(() => {})
          throw new PayloadTooLargeError(`Payload exceeds limit of ${maxBytes} bytes`)
        }
        chunks.push(value)
      }
    }
  } catch (err) {
    await reader.cancel().catch(() => {})
    throw err
  }

  // 4. Сливане на парчетата и декодиране
  const merged = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }

  const text = new TextDecoder('utf-8').decode(merged)
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('Невалиден JSON формат.')
  }
}

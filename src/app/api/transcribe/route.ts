import { NextRequest, NextResponse } from 'next/server'
import {
  requireAnyAuthenticatedRole,
  checkScopedRateLimit,
  AuthError,
} from '@/features/auth/lib/role-guard'
import { TranscribeRequestSchema } from '@/features/voice/schemas'
import {
  transcribeAudioWithWhisper,
  TranscriptionError,
} from '@/features/voice/lib/transcribe-server'

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // 1. Защита на ниво API Route (Defense in Depth)
    const session = await requireAnyAuthenticatedRole()
    const userIdentifier = `${session.role}:${session.createdAt || 'session'}`

    // 2. Rate Limiting (максимум 20 гласови транскрипции на минута, обвързани със сесията)
    const rateCheck = await checkScopedRateLimit('transcribe', 20, 60_000, userIdentifier)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Твърде много гласови заявки. Моля, изчакайте минута.' },
        { status: 429 }
      )
    }

    // 3. Проверка на размера на тялото преди JSON парсване (DoS защита)
    const contentLength = request.headers.get('content-length')
    const MAX_AUDIO_PAYLOAD_BYTES = 5 * 1024 * 1024 // 5 MB
    if (contentLength && parseInt(contentLength, 10) > MAX_AUDIO_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: 'Аудио записът надвишава допустимия размер от 5MB.' },
        { status: 413 }
      )
    }

    // 4. Валидация на входните данни
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Невалиден JSON формат.' }, { status: 400 })
    }

    const parsed = TranscribeRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Невалидни данни за транскрипция.' },
        { status: 400 }
      )
    }

    // 5. Извикване на Whisper през OpenRouter
    const result = await transcribeAudioWithWhisper(parsed.data)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error in /api/transcribe:', error)
    const status =
      error instanceof AuthError || error instanceof TranscriptionError ? error.statusCode : 500
    const message =
      error instanceof Error ? error.message : 'Възникна грешка при гласовата транскрипция.'
    return NextResponse.json({ error: message }, { status })
  }
}

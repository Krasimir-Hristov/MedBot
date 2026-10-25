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
import { readBoundedJson, PayloadTooLargeError } from '@/lib/http-payload'

const MAX_AUDIO_PAYLOAD_BYTES = 5 * 1024 * 1024 // 5 MB

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // 1. Защита на ниво API Route (Defense in Depth)
    const session = await requireAnyAuthenticatedRole()
    const userIdentifier = session.jti || `${session.role}:${session.createdAt || 'session'}`

    // 2. Rate Limiting (максимум 20 гласови транскрипции на минута, обвързани с jti сесията)
    const rateCheck = await checkScopedRateLimit('transcribe', 20, 60_000, userIdentifier)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Твърде много гласови заявки. Моля, изчакайте минута.' },
        { status: 429 }
      )
    }

    // 3. Поточно прочитане с лимит на реално получените байтове (DoS защита)
    let body: unknown
    try {
      body = await readBoundedJson(request, MAX_AUDIO_PAYLOAD_BYTES)
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        return NextResponse.json(
          { error: 'Аудио записът надвишава допустимия размер от 5MB.' },
          { status: 413 }
        )
      }
      return NextResponse.json({ error: 'Невалиден JSON формат.' }, { status: 400 })
    }

    // 4. Валидация на входните данни
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

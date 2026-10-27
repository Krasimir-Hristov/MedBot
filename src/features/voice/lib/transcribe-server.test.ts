import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { transcribeAudioWithWhisper, TranscriptionError } from './transcribe-server'

describe('Whisper Audio Transcription (/api/v1/audio/transcriptions STT)', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.stubEnv('OPENROUTER_API_KEY', 'sk-or-whisper-test-key')
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('throws TranscriptionError(500) when OPENROUTER_API_KEY is not configured', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '')

    await expect(
      transcribeAudioWithWhisper({
        audioBase64: 'UklGRiQAAABXQVZF',
        format: 'webm',
        language: 'bg',
      })
    ).rejects.toMatchObject({
      name: 'TranscriptionError',
      statusCode: 500,
    })
  })

  it('throws TranscriptionError(400) when data URL prefix has empty base64 payload', async () => {
    await expect(
      transcribeAudioWithWhisper({
        audioBase64: 'data:audio/webm;base64,',
        format: 'webm',
        language: 'el',
      })
    ).rejects.toMatchObject({
      name: 'TranscriptionError',
      statusCode: 400,
    })
  })

  it('strips data URL prefix and sends audio to OpenRouter STT endpoint (never chat/completions)', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          text: '  Какви са резултатите от последния скенер?  ',
          usage: { duration: 4.2 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const result = await transcribeAudioWithWhisper({
      audioBase64: 'data:audio/webm;base64,UklGRiQAAABXQVZFZm10',
      format: 'webm',
      language: 'bg',
    })

    expect(result).toEqual({
      text: 'Какви са резултатите от последния скенер?',
      durationSeconds: 4.2,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [endpoint, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(endpoint).toBe('https://openrouter.ai/api/v1/audio/transcriptions')
    const parsedBody = JSON.parse(String(init.body)) as {
      input_audio: { data: string; format: string }
      language: string
    }
    expect(parsedBody.input_audio).toEqual({
      data: 'UklGRiQAAABXQVZFZm10',
      format: 'webm',
    })
    expect(parsedBody.language).toBe('bg')
  })

  it('throws TranscriptionError(502) when OpenRouter returns non-OK HTTP status', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('Upstream timeout', { status: 502 })) as unknown as typeof fetch

    await expect(
      transcribeAudioWithWhisper({
        audioBase64: 'UklGRiQAAABXQVZFZm10',
        format: 'mp3',
        language: 'el',
      })
    ).rejects.toBeInstanceOf(TranscriptionError)
    errSpy.mockRestore()
  })
})

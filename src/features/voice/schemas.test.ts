import { describe, it, expect } from 'vitest'
import { TranscribeRequestSchema } from './schemas'

describe('Voice Dictation - TranscribeRequestSchema', () => {
  it('accepts valid audio base64 with default webm format and bg language', () => {
    const parsed = TranscribeRequestSchema.safeParse({
      audioBase64: 'GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////',
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.format).toBe('webm')
      expect(parsed.data.language).toBe('bg')
    }
  })

  it('accepts Greek language and m4a/mp3 formats', () => {
    const parsed = TranscribeRequestSchema.safeParse({
      audioBase64: 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA',
      format: 'mp3',
      language: 'el',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects empty/short audio payload or unsupported language', () => {
    expect(TranscribeRequestSchema.safeParse({ audioBase64: 'short' }).success).toBe(false)
    expect(
      TranscribeRequestSchema.safeParse({
        audioBase64: 'GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibQ==',
        language: 'en',
      }).success
    ).toBe(false)
  })
})

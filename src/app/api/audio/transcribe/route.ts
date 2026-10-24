import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import { AI_MODELS, openrouter } from '@/lib/openrouter'

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const session = await verifySessionToken(token)
    if (!session) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп. Моля, влезте с ПИН код.' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const language = (formData.get('language') as string | null) || 'el'

    if (!file) {
      return NextResponse.json(
        { error: 'Липсва аудио файл за транскрипция.' },
        { status: 400 }
      )
    }

    const response = await openrouter.audio.transcriptions.create({
      model: AI_MODELS.audio,
      file,
      language: language === 'bg' ? 'bg' : 'el',
    })

    return NextResponse.json({
      text: response.text || '',
    })
  } catch (error) {
    console.error('Error in /api/audio/transcribe:', error)
    return NextResponse.json(
      { error: 'Възникна грешка при транскрибиране на гласа.' },
      { status: 500 }
    )
  }
}

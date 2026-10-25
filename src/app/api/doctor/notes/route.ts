import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import {
  createDoctorNote,
  deleteDoctorNote,
  getDoctorNotes,
} from '@/features/doctor/lib/notes-dal'
import { AI_MODELS, openrouter } from '@/lib/openrouter'

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  try {
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const notes = await getDoctorNotes()
    return NextResponse.json({ notes })
  } catch (error) {
    console.error('Error fetching doctor notes:', error)
    return NextResponse.json(
      { error: 'Грешка при зареждане на лекарските бележки.' },
      { status: 500 }
    )
  }
}

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const body = await request.json()
    const rawNote = (body.note as string | undefined)?.trim()
    const doctorName = (body.doctorName as string | undefined)?.trim() || 'Д-р Специалист'

    if (!rawNote) {
      return NextResponse.json(
        { error: 'Текстът на бележката не може да бъде празен.' },
        { status: 400 }
      )
    }

    // AI Превод между Гръцки и Български
    const translationPrompt = `
You are a bilingual medical assistant translating doctor's notes and clinical recommendations between Greek (Ελληνικά) and Bulgarian (Български).
Input text may be in Greek or Bulgarian.
Generate a JSON with two keys:
1. "note_el": professional clinical note in Greek.
2. "note_bg": clear, empathetic, easy-to-read Bulgarian translation/explanation for an elderly oncology patient and her family.
Input: """${rawNote}"""
Return ONLY a valid JSON object {"note_el": "...", "note_bg": "..."}.
`.trim()

    let noteEl = rawNote
    let noteBg = rawNote

    try {
      const completion = await openrouter.chat.completions.create({
        model: AI_MODELS.fast,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: translationPrompt }],
      })

      const content = completion.choices[0]?.message?.content ?? ''
      const parsed = JSON.parse(content) as { note_el?: string; note_bg?: string }
      if (parsed.note_el) noteEl = parsed.note_el
      if (parsed.note_bg) noteBg = parsed.note_bg
    } catch (translationError) {
      console.warn('AI translation fallback to raw text:', translationError)
    }

    const created = await createDoctorNote({
      noteEl,
      noteBg,
      doctorName,
    })

    return NextResponse.json({ note: created }, { status: 201 })
  } catch (error) {
    console.error('Error creating doctor note:', error)
    return NextResponse.json(
      { error: 'Грешка при запис на лекарската бележка.' },
      { status: 500 }
    )
  }
}

export const DELETE = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const idParam = searchParams.get('id')
    const id = idParam ? parseInt(idParam, 10) : null

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: 'Невалиден ID на бележка.' }, { status: 400 })
    }

    const deleted = await deleteDoctorNote(id)
    return NextResponse.json({ success: deleted })
  } catch (error) {
    console.error('Error deleting doctor note:', error)
    return NextResponse.json(
      { error: 'Грешка при изтриване на лекарската бележка.' },
      { status: 500 }
    )
  }
}

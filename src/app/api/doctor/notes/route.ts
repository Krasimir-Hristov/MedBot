import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/features/auth/lib/session'
import { getDoctorNotes } from '@/features/doctor/lib/notes-dal'
import { CreateTextNoteSchema } from '@/features/doctor-notes/schemas'
import { processTextNoteAI } from '@/features/doctor-notes/lib/note-ai-pipeline'
import { createDoctorNote, deleteDoctorNote } from '@/features/doctor-notes/dal'

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  try {
    const session = await verifySessionToken(token)
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 })
    }

    const notes = await getDoctorNotes(50)
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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Невалиден JSON формат.' },
        { status: 400 }
      )
    }

    const rawNote =
      typeof body === 'object' && body !== null && 'note' in body
        ? (body as { note: unknown }).note
        : undefined

    const doctorName =
      typeof body === 'object' && body !== null && 'doctorName' in body
        ? (body as { doctorName: unknown }).doctorName
        : undefined

    const category =
      typeof body === 'object' && body !== null && 'category' in body
        ? (body as { category: unknown }).category
        : undefined

    const parsed = CreateTextNoteSchema.safeParse({
      noteText: rawNote,
      category,
      doctorName,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Текстът на бележката не може да бъде празен.' },
        { status: 400 }
      )
    }

    const processed = await processTextNoteAI(
      parsed.data.noteText,
      parsed.data.category,
      parsed.data.doctorName
    )

    const created = await createDoctorNote(processed)
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

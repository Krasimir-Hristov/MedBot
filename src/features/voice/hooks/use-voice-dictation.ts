'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  SpeechRecognitionErrorEventLike,
  SpeechRecognitionEventLike,
  SpeechRecognitionInstance,
  VoiceDictationOptions,
  VoiceState,
  WindowWithSpeechRecognition,
} from '../types'

export const useVoiceDictation = ({
  lang,
  onTranscript,
  onError,
  maxDurationSeconds = 60,
}: VoiceDictationOptions) => {
  const [state, setState] = useState<VoiceState>('idle')
  const [interimText, setInterimText] = useState('')

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const stopAllAudioTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
  }

  // Спиране на Web Speech
  const stopWebSpeech = useCallback(() => {
    clearTimer()
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignore already stopped
      }
      recognitionRef.current = null
    }
    setState('idle')
    setInterimText('')
  }, [])

  // Стартиране на Whisper Fallback запис чрез MediaRecorder
  const startWhisperFallback = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Вашият браузър не поддържа микрофонен запис.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      audioChunksRef.current = []

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        stopAllAudioTracks()
        const chunks = audioChunksRef.current
        if (chunks.length === 0) {
          setState('idle')
          return
        }

        setState('transcribing')
        try {
          const actualMime = recorder.mimeType || 'audio/webm'
          const audioBlob = new Blob(chunks, { type: actualMime })
          const reader = new FileReader()

          reader.onloadend = async () => {
            const dataUrl = reader.result as string
            const format = actualMime.includes('mp4') ? 'mp4' : 'webm'
            const targetLang = lang.startsWith('bg') ? 'bg' : 'el'

            try {
              const res = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audioBase64: dataUrl,
                  format,
                  language: targetLang,
                }),
              })

              const data = (await res.json()) as { text?: string; error?: string }
              if (res.ok && data.text) {
                onTranscript(data.text)
              } else {
                throw new Error(data.error || 'Неуспешна транскрипция.')
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Грешка при изпращане на аудиозаписа.'
              onError?.(msg)
            } finally {
              setState('idle')
              setInterimText('')
            }
          }

          reader.readAsDataURL(audioBlob)
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Грешка при подготовка на аудиозаписа.'
          onError?.(msg)
          setState('idle')
          setInterimText('')
        }
      }

      recorder.start()
      setState('recording')

      clearTimer()
      timerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }, maxDurationSeconds * 1000)
    } catch (err) {
      stopAllAudioTracks()
      setState('idle')
      const msg = err instanceof Error ? err.message : 'Няма достъп до микрофона.'
      onError?.(msg)
    }
  }, [lang, maxDurationSeconds, onError, onTranscript])

  // Главен метод за стартиране
  const startListening = useCallback(async () => {
    if (state !== 'idle') return

    const win = typeof window !== 'undefined' ? (window as unknown as WindowWithSpeechRecognition) : undefined
    const SpeechRecognitionConstructor = win?.SpeechRecognition || win?.webkitSpeechRecognition

    // Ако няма Web Speech (напр. Firefox) -> директно Whisper Fallback
    if (!SpeechRecognitionConstructor) {
      await startWhisperFallback()
      return
    }

    try {
      const recognition = new SpeechRecognitionConstructor()
      recognitionRef.current = recognition
      recognition.lang = lang
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onstart = () => {
        setState('listening')
      }

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let finalTrans = ''
        let interimTrans = ''

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const item = event.results.item(i)
          const firstAlt = item?.item(0)
          if (firstAlt) {
            if (item.isFinal) {
              finalTrans += firstAlt.transcript + ' '
            } else {
              interimTrans += firstAlt.transcript
            }
          }
        }

        if (finalTrans.trim()) {
          onTranscript(finalTrans.trim())
        }
        setInterimText(interimTrans)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        if (recognitionRef.current !== recognition) return
        const errType = event.error
        // Ако браузърът няма Speech услуга за езика или е блокирана -> fallback към Whisper
        if (errType === 'service-not-allowed' || errType === 'language-not-supported' || errType === 'network') {
          recognition.onend = null
          stopWebSpeech()
          void startWhisperFallback()
          return
        }

        if (errType !== 'no-speech' && errType !== 'aborted') {
          onError?.(`Грешка при гласово разпознаване: ${errType}`)
        }
        stopWebSpeech()
      }

      recognition.onend = () => {
        if (recognitionRef.current === recognition) {
          stopWebSpeech()
        }
      }

      recognition.start()

      clearTimer()
      timerRef.current = setTimeout(() => {
        stopWebSpeech()
      }, maxDurationSeconds * 1000)
    } catch (err) {
      console.warn('SpeechRecognition start failed, falling back to MediaRecorder:', err)
      await startWhisperFallback()
    }
  }, [lang, maxDurationSeconds, onError, onTranscript, startWhisperFallback, state, stopWebSpeech])

  // Главен метод за спиране
  const stopListening = useCallback(() => {
    if (state === 'listening') {
      stopWebSpeech()
    } else if (state === 'recording') {
      clearTimer()
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [state, stopWebSpeech])

  const toggleListening = useCallback(() => {
    if (state === 'idle') {
      void startListening()
    } else {
      stopListening()
    }
  }, [startListening, state, stopListening])

  // Cleanup при размонтиране
  useEffect(() => {
    return () => {
      clearTimer()
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // Ignore
        }
      }
      stopAllAudioTracks()
    }
  }, [])

  return {
    state,
    isListening: state === 'listening' || state === 'recording',
    isTranscribing: state === 'transcribing',
    interimText,
    startListening,
    stopListening,
    toggleListening,
  }
}

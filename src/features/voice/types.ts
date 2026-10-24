export type VoiceLang = 'bg-BG' | 'el-GR'

export type VoiceState = 'idle' | 'listening' | 'recording' | 'transcribing' | 'error'

export interface VoiceDictationOptions {
  lang: VoiceLang
  onTranscript: (text: string) => void
  onError?: (errorMessage: string) => void
  maxDurationSeconds?: number
}

// Стриктни типизации за Web Speech API без 'any'
export interface SpeechRecognitionResultLike {
  readonly length: number
  item(index: number): SpeechRecognitionAlternativeLike
  [index: number]: SpeechRecognitionAlternativeLike
  readonly isFinal: boolean
}

export interface SpeechRecognitionAlternativeLike {
  readonly transcript: string
  readonly confidence: number
}

export interface SpeechRecognitionResultListLike {
  readonly length: number
  item(index: number): SpeechRecognitionResultLike
  [index: number]: SpeechRecognitionResultLike
}

export interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultListLike
}

export interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string
  readonly message?: string
}

export interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEventLike) => void) | null
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEventLike) => void) | null
}

export interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: {
    new (): SpeechRecognitionInstance
  }
  webkitSpeechRecognition?: {
    new (): SpeechRecognitionInstance
  }
}

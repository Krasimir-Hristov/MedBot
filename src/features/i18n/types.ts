export type Locale = 'bg' | 'el'

export interface TranslationDictionary {
  common: {
    appName: string
    appSubtitle: string
    footerCopyright: string
    logout: string
    loading: string
    cancel: string
    confirm: string
    switchLanguage: string
  }
  auth: {
    pinTitle: string
    pinSubtitle: string
    pinInputAria: string
    pinPlaceholder: string
    clear: string
    deleteAria: string
    digitAria: string
    submitAria: string
    errorMinLength: string
    errorMaxLength: string
    errorFormat: string
    errorInvalidPin: string
    errorRateLimited: string
    errorGeneric: string
    secureSessionNotice: string
  }
  admin: {
    title: string
    subtitle: string
    step1CompleteTitle: string
    step1CompleteDesc: string
  }
  doctor: {
    title: string
    subtitle: string
    welcomeTitle: string
    welcomeDesc: string
    quickPrompts: {
      timeline: string
      histology: string
      imaging: string
      markers: string
    }
  }
  patient: {
    title: string
    subtitle: string
    welcomeTitle: string
    welcomeDesc: string
    voiceAssistant: string
    voiceAssistantStep: string
  }
}

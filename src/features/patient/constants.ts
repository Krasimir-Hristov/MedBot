export const PATIENT_DEFAULT_SESSION_ID = 'patient-primary-active'

export const PATIENT_QUICK_QUESTIONS = [
  {
    id: 'diet-water',
    icon: '🥗',
    text: 'Какво мога да ям и колко вода да пия според лекаря?',
  },
  {
    id: 'next-visit',
    icon: '📅',
    text: 'Кога е следващият преглед и какво изследване трябва да направя?',
  },
  {
    id: 'fever-warning',
    icon: '⚠️',
    text: 'При каква температура или симптоми да се свържа с лекаря?',
  },
  {
    id: 'histology-stage',
    icon: '🩺',
    text: 'Какъв е първоначалният ми стадий и хистология от досието?',
  },
] as const


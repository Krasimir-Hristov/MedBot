import { UserRole } from '../types'

/**
 * Безопасно сравнение на стрингове за предотвратяване на timing attacks
 */
const safeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * Проверява въведения ПИН код и връща съответната роля
 */
export const verifyPinAndGetRole = (pin: string): UserRole | null => {
  const cleanPin = pin.trim()
  if (!cleanPin) {
    return null
  }

  const adminPin = process.env.ADMIN_PIN
  const doctorPin = process.env.DOCTOR_PIN
  const patientPin = process.env.PATIENT_PIN

  if (adminPin && safeCompare(cleanPin, adminPin)) {
    return 'admin'
  }

  if (doctorPin && safeCompare(cleanPin, doctorPin)) {
    return 'doctor'
  }

  if (patientPin && safeCompare(cleanPin, patientPin)) {
    return 'patient'
  }

  return null
}

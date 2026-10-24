import { createHmac, timingSafeEqual } from 'node:crypto'
import { UserRole } from '../types'
import { getSecretKey } from './keys'

/**
 * Безопасно сравнение на стрингове чрез HMAC digests с фиксирана дължина
 * и crypto.timingSafeEqual за елиминиране на всякакви timing attacks за дължина или съдържание.
 */
const safeCompare = (input: string, target: string): boolean => {
  try {
    const key = Buffer.from(getSecretKey())
    const hmacInput = createHmac('sha256', key).update(input).digest()
    const hmacTarget = createHmac('sha256', key).update(target).digest()

    return timingSafeEqual(hmacInput, hmacTarget)
  } catch (error) {
    console.error('Error during safe PIN comparison:', error)
    return false
  }
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

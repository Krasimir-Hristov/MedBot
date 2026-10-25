import { JWTPayload } from 'jose'

export type UserRole = 'admin' | 'doctor' | 'patient'

export type AuthErrorCode = 'INVALID_PIN' | 'VALIDATION_ERROR' | 'RATE_LIMITED' | 'SERVER_ERROR'

export interface SessionPayload extends JWTPayload {
  role: UserRole
  createdAt: number
  jti?: string
}

export interface AuthResult {
  success: boolean
  errorCode?: AuthErrorCode
  error?: string
  redirectTo?: string
}

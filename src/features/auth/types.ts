import { JWTPayload } from 'jose'

export type UserRole = 'admin' | 'doctor' | 'patient'

export interface SessionPayload extends JWTPayload {
  role: UserRole
  createdAt: number
}

export interface AuthResult {
  success: boolean
  error?: string
  redirectTo?: string
}

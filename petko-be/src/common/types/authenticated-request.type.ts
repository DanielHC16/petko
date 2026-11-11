import { Request } from 'express'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url: string
  role: 'admin' | 'customer'
  tos_accepted: boolean
}

export interface AuthenticatedRequest extends Request {
  user: UserProfile
}

import { Request } from 'express'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url: string
  role: 'admin' | 'customer'
}

export interface AuthenticatedRequest extends Request {
  user: UserProfile
}

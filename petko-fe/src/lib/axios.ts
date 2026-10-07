import axios from 'axios'
import { supabase } from '@/lib/supabase'

// Same-origin `/api` by default: Vercel serves the NestJS function there,
// and the Vite dev server proxies `/api` to the local backend.
// Set VITE_API_URL only to target an API on another origin (must include `/api`).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: false,
})

// Attach the Supabase JWT to every NestJS API request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

// Redirect to /login on 401
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401
    ) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

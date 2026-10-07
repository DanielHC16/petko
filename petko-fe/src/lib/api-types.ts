export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

/** Error envelope returned by the NestJS HttpExceptionFilter. */
export interface ApiErrorBody {
  success: false
  statusCode: number
  message: string
  errors: unknown[]
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: PaginationMeta
  message: string
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

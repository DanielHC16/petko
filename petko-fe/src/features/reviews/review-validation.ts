import type { ReviewDraft } from './review-types'

export const REVIEW_COMMENT_LIMIT = 2000

export function validateReview(draft: ReviewDraft): string | null {
  if (!Number.isInteger(draft.rating) || draft.rating < 1 || draft.rating > 5) return 'Choose a rating from 1 to 5 paws.'
  if ([...draft.comment.trim()].length > REVIEW_COMMENT_LIMIT) return 'Keep your review to 2,000 characters or fewer.'
  return null
}

export function reviewDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }).format(date)
}

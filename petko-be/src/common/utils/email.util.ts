/** Canonical form for stored and compared emails: trimmed and lowercase. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Escapes `\`, `%` and `_` so the value matches literally inside a
 * PostgREST `ilike` filter (otherwise `_` and `%` act as wildcards).
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

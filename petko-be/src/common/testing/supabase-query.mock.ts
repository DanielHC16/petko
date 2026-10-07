/**
 * Test-only stand-in for the Supabase/PostgREST query builder (excluded from
 * the production build via tsconfig.build.json).
 *
 * Every `from(table)` call returns a fresh chainable builder that records the
 * calls made on it and resolves to the next queued result for that table.
 */
export interface QueryResult {
  data?: unknown
  error?: { message: string; code?: string } | null
  count?: number | null
}

export interface RecordedQuery {
  table: string
  calls: Array<{ method: string; args: unknown[] }>
  /** Args of the first call to `method`, or undefined if never called. */
  argsOf: (method: string) => unknown[] | undefined
}

const CHAIN_METHODS = [
  'select',
  'eq',
  'ilike',
  'order',
  'insert',
  'update',
  'upsert',
  'delete',
  'single',
  'maybeSingle',
  'returns',
] as const

export interface SupabaseQueryMock {
  from: jest.Mock
  queries: RecordedQuery[]
  /** Queues results for a table, consumed in call order. */
  queue: (table: string, ...results: QueryResult[]) => void
}

export function createSupabaseQueryMock(): SupabaseQueryMock {
  const queues = new Map<string, QueryResult[]>()
  const queries: RecordedQuery[] = []

  const from = jest.fn((table: string) => {
    const recorded: RecordedQuery = {
      table,
      calls: [],
      argsOf: (method) => recorded.calls.find((c) => c.method === method)?.args,
    }
    queries.push(recorded)
    const result = queues.get(table)?.shift() ?? { data: null, error: null }

    const builder: Record<string, unknown> = {
      then: (resolve: (value: QueryResult) => void) =>
        resolve({ data: null, error: null, count: null, ...result }),
    }
    for (const method of CHAIN_METHODS) {
      builder[method] = (...args: unknown[]) => {
        recorded.calls.push({ method, args })
        return builder
      }
    }
    return builder
  })

  return {
    from,
    queries,
    queue: (table, ...results) => {
      queues.set(table, [...(queues.get(table) ?? []), ...results])
    },
  }
}

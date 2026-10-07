/**
 * Jest setup (unit + e2e): dummy config so tests never need or read a real
 * `.env` file. `VERCEL=1` makes ConfigModule skip the env file entirely.
 * No test may reach Supabase; these values point nowhere real.
 */
process.env.VERCEL = '1'
process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_ANON_KEY = 'dummy-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-service-role-key'
delete process.env.FRONTEND_URL

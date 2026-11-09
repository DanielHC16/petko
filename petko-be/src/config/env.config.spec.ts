import { ConfigModule } from '@nestjs/config'
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getEnvConfig } from './env.config'

describe('local environment configuration', () => {
  const originalEnv = process.env
  let directory: string
  let backendDirectory: string
  let cacheFile: string
  let rootFile: string
  let backendFile: string

  beforeEach(() => {
    // All file reads stay inside a fresh fixture, never the checkout's env files.
    directory = mkdtempSync(join(tmpdir(), 'petko-env-test-'))
    backendDirectory = join(directory, 'petko-be')
    mkdirSync(backendDirectory)
    mkdirSync(join(directory, '.vercel'))
    cacheFile = join(directory, '.vercel', '.env.development.local')
    rootFile = join(directory, '.env.local')
    backendFile = join(backendDirectory, '.env')
    process.env = { NODE_ENV: 'test' }
  })

  afterEach(() => {
    process.env = originalEnv
    for (const file of [cacheFile, rootFile, backendFile]) {
      rmSync(file, { force: true })
    }
    rmdirSync(join(directory, '.vercel'))
    rmdirSync(backendDirectory)
    rmdirSync(directory)
  })

  function writeRequiredEnv(file: string): void {
    writeFileSync(
      file,
      'SUPABASE_URL=https://example.supabase.co\n' +
        'SUPABASE_SERVICE_ROLE_KEY=dummy-service-role-key\n' +
        'SUPABASE_ANON_KEY=dummy-anon-key\n',
    )
  }

  it('loads vercel pull output from the repository root', async () => {
    writeRequiredEnv(cacheFile)

    await ConfigModule.forRoot(getEnvConfig(backendDirectory))

    expect(process.env.SUPABASE_URL).toBe('https://example.supabase.co')
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBe('dummy-service-role-key')
    expect(process.env.SUPABASE_ANON_KEY).toBe('dummy-anon-key')
  })

  it('supports vercel env pull and preserves backend and shell overrides', async () => {
    writeRequiredEnv(cacheFile)
    writeFileSync(rootFile, 'SUPABASE_ANON_KEY=root-public-key\n')
    writeFileSync(backendFile, 'SUPABASE_SERVICE_ROLE_KEY=local-dummy-key\n')
    process.env.SUPABASE_URL = 'https://shell.example.com'

    await ConfigModule.forRoot(getEnvConfig(backendDirectory))

    expect(process.env.SUPABASE_URL).toBe('https://shell.example.com')
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBe('local-dummy-key')
    expect(process.env.SUPABASE_ANON_KEY).toBe('root-public-key')
  })

  it('never loads local files on Vercel', async () => {
    writeRequiredEnv(cacheFile)
    writeRequiredEnv(rootFile)
    writeRequiredEnv(backendFile)
    process.env.VERCEL = '1'

    await expect(
      ConfigModule.forRoot(getEnvConfig(backendDirectory)),
    ).rejects.toThrow('"SUPABASE_URL" is required')
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined()
  })

  it('still fails startup when required variables are missing', async () => {
    await expect(
      ConfigModule.forRoot(getEnvConfig(backendDirectory)),
    ).rejects.toThrow('"SUPABASE_URL" is required')
  })
})

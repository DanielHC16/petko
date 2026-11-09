import type { ConfigModuleOptions } from '@nestjs/config'
import { resolve } from 'node:path'
import { envValidationSchema } from './env.validation'

export function getEnvConfig(
  backendDirectory = resolve(__dirname, '../..'),
  env: NodeJS.ProcessEnv = process.env,
): ConfigModuleOptions {
  return {
    isGlobal: true,
    ignoreEnvFile: Boolean(env.VERCEL),
    // Local overrides win; both Vercel pull commands can supply shared defaults.
    envFilePath: [
      resolve(backendDirectory, '.env'),
      resolve(backendDirectory, '../.env.local'),
      resolve(backendDirectory, '../.vercel/.env.development.local'),
    ],
    validationSchema: envValidationSchema,
  }
}

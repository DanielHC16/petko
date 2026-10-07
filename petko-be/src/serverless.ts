import 'reflect-metadata'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Logger } from '@nestjs/common'
import type { Express } from 'express'
import type { ErrorResponse } from './common/filters/http-exception.filter'

/**
 * Vercel serverless entry (re-exported by the repo-root `api/index.js`).
 *
 * The Nest app is bootstrapped once per warm function instance and reused
 * across invocations. A failed bootstrap is not cached, so the next request
 * retries instead of failing forever, and the failing request gets the
 * standard JSON error envelope instead of an opaque platform error.
 */
let cachedServer: Promise<Express> | null = null

const logger = new Logger('Serverless')

async function bootstrapServer(): Promise<Express> {
  // Loaded lazily: requiring AppModule starts the async env validation in
  // ConfigModule.forRoot(). With a static import, a validation failure is an
  // unhandled rejection while Vercel loads this file and kills the function
  // before the handler can send the JSON error envelope. Here, createApp()
  // awaits it in the same tick, so the failure reaches the catch below.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createApp } = require('./bootstrap') as typeof import('./bootstrap')
  const app = await createApp()
  await app.init()
  return app.getHttpAdapter().getInstance()
}

async function getServer(): Promise<Express> {
  cachedServer ??= bootstrapServer()
  try {
    return await cachedServer
  } catch (err: unknown) {
    cachedServer = null
    throw err
  }
}

function sendBootstrapError(res: ServerResponse): void {
  if (res.headersSent) return
  const body: ErrorResponse = {
    success: false,
    statusCode: 500,
    message: 'Internal server error',
    errors: [],
  }
  res.statusCode = 500
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let server: Express
  try {
    server = await getServer()
  } catch (err: unknown) {
    logger.error(
      'Bootstrap failed',
      err instanceof Error ? err.stack : String(err),
    )
    sendBootstrapError(res)
    return
  }
  server(req, res)
}

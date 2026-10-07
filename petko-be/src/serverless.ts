import 'reflect-metadata'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Express } from 'express'
import { createApp } from './bootstrap'

/**
 * Vercel serverless entry (re-exported by the repo-root `api/index.js`).
 *
 * The Nest app is bootstrapped once per warm function instance and reused
 * across invocations. A failed bootstrap is not cached, so the next request
 * retries instead of failing forever.
 */
let cachedServer: Promise<Express> | null = null

async function bootstrapServer(): Promise<Express> {
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

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const server = await getServer()
  server(req, res)
}

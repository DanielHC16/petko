import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Logger } from '@nestjs/common'

jest.mock('./bootstrap', () => ({ createApp: jest.fn() }))

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>

interface FakeResponse {
  statusCode: number
  headersSent: boolean
  headers: Record<string, string>
  body: string
  setHeader: jest.Mock
  end: jest.Mock
}

function createResponse(): FakeResponse {
  const res: FakeResponse = {
    statusCode: 200,
    headersSent: false,
    headers: {},
    body: '',
    setHeader: jest.fn((name: string, value: string) => {
      res.headers[name.toLowerCase()] = value
    }),
    end: jest.fn((chunk?: string) => {
      res.body = chunk ?? ''
    }),
  }
  return res
}

/** Loads a fresh copy of the handler (clean module-level cache) and its mocked bootstrap. */
/* eslint-disable @typescript-eslint/no-require-imports */
// The handler requires './bootstrap' lazily, so tests reset the shared module
// registry (not jest.isolateModules) to get a clean cache per test.
function loadFreshHandler(): Handler {
  jest.resetModules()
  // Silence the expected bootstrap-failure log.
  const nest = require('@nestjs/common') as { Logger: typeof Logger }
  jest.spyOn(nest.Logger.prototype, 'error').mockImplementation(() => undefined)
  return (require('./serverless') as { default: Handler }).default
}

function loadHandler(): { handler: Handler; createApp: jest.Mock } {
  const handler = loadFreshHandler()
  const bootstrap = require('./bootstrap') as { createApp: jest.Mock }
  return { handler, createApp: bootstrap.createApp }
}
/* eslint-enable @typescript-eslint/no-require-imports */

function fakeApp(express: jest.Mock): unknown {
  return {
    init: jest.fn().mockResolvedValue(undefined),
    getHttpAdapter: () => ({ getInstance: () => express }),
  }
}

const req = {} as IncomingMessage

describe('serverless handler', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns the JSON 500 envelope when bootstrap fails', async () => {
    const { handler, createApp } = loadHandler()
    createApp.mockRejectedValueOnce(new Error('missing SUPABASE_URL'))
    const res = createResponse()

    await handler(req, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(500)
    expect(res.headers['content-type']).toBe('application/json; charset=utf-8')
    expect(JSON.parse(res.body)).toEqual({
      success: false,
      statusCode: 500,
      message: 'Internal server error',
      errors: [],
    })
    expect(res.body).not.toContain('missing SUPABASE_URL')
  })

  it('does not load the app module until the first request', async () => {
    const factory = jest.fn(() => ({ createApp: jest.fn() }))
    jest.doMock('./bootstrap', factory)

    const handler = loadFreshHandler()
    expect(factory).not.toHaveBeenCalled()

    await handler(req, createResponse() as unknown as ServerResponse)
    expect(factory).toHaveBeenCalledTimes(1)

    // Restore the file-level mock for the remaining tests.
    jest.doMock('./bootstrap', () => ({ createApp: jest.fn() }))
  })

  it('does not write when headers were already sent', async () => {
    const { handler, createApp } = loadHandler()
    createApp.mockRejectedValueOnce(new Error('boom'))
    const res = createResponse()
    res.headersSent = true

    await handler(req, res as unknown as ServerResponse)

    expect(res.end).not.toHaveBeenCalled()
  })

  it('retries bootstrap on the next request after a failure', async () => {
    const { handler, createApp } = loadHandler()
    const express = jest.fn()
    createApp
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(fakeApp(express))

    await handler(req, createResponse() as unknown as ServerResponse)
    const res = createResponse()
    await handler(req, res as unknown as ServerResponse)

    expect(createApp).toHaveBeenCalledTimes(2)
    expect(express).toHaveBeenCalledWith(req, res)
  })

  it('caches a successful bootstrap across requests', async () => {
    const { handler, createApp } = loadHandler()
    const express = jest.fn()
    createApp.mockResolvedValue(fakeApp(express))

    await handler(req, createResponse() as unknown as ServerResponse)
    await handler(req, createResponse() as unknown as ServerResponse)

    expect(createApp).toHaveBeenCalledTimes(1)
    expect(express).toHaveBeenCalledTimes(2)
  })
})

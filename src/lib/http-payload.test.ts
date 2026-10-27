import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { PayloadTooLargeError, readBoundedJson } from './http-payload'

const createJsonRequest = (
  chunks: string[],
  headers?: Record<string, string>,
  onPull?: (index: number) => void
): NextRequest => {
  const encoder = new TextEncoder()
  let index = 0
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        onPull?.(index)
        controller.enqueue(encoder.encode(chunks[index]))
        index += 1
      } else {
        controller.close()
      }
    },
  })

  return new NextRequest('http://localhost:3000/api/test', {
    method: 'POST',
    body: stream,
    headers,
    duplex: 'half',
  })
}

describe('HTTP Payload - Bounded JSON Stream Reader', () => {
  it('parses valid multi-chunk UTF-8 JSON within byte limit', async () => {
    const req = createJsonRequest(['{"title":"Епикриза",', '"count":3}'])
    const parsed = await readBoundedJson<{ title: string; count: number }>(req, 1024)

    expect(parsed).toEqual({ title: 'Епикриза', count: 3 })
  })

  it('rejects immediately with PayloadTooLargeError when Content-Length exceeds limit', async () => {
    const req = createJsonRequest(['{"ok":true}'], { 'content-length': '50000' })

    await expect(readBoundedJson(req, 1024)).rejects.toThrow(PayloadTooLargeError)
  })

  it('aborts mid-stream when chunked payload exceeds limit despite spoofed small Content-Length without pulling further chunks', async () => {
    const pulledChunks: number[] = []
    const chunkA = '{"data":"' + 'A'.repeat(600)
    const chunkB = 'B'.repeat(600) + '"}'
    const chunkC = 'never-requested-chunk'
    const req = createJsonRequest([chunkA, chunkB, chunkC], { 'content-length': '20' }, (idx) => {
      pulledChunks.push(idx)
    })

    await expect(readBoundedJson(req, 800)).rejects.toThrow(PayloadTooLargeError)
    expect(pulledChunks).toEqual([0, 1])
    expect(pulledChunks).not.toContain(2)
  })

  it('throws friendly error on malformed JSON body', async () => {
    const req = createJsonRequest(['{"broken": '])

    await expect(readBoundedJson(req, 1024)).rejects.toThrow('Невалиден JSON формат.')
  })

  it('throws error when request has no body', async () => {
    const req = new NextRequest('http://localhost:3000/api/test', { method: 'POST' })

    await expect(readBoundedJson(req, 1024)).rejects.toThrow('Липсва тяло на заявката.')
  })
})

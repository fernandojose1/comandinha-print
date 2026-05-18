import { describe, it, expect } from 'vitest'
import net from 'node:net'
import { send } from '../src/printer.js'

describe('printer.send', () => {
  it('writes decoded base64 bytes to TCP socket and resolves ok', async () => {
    const received = []
    const server = net.createServer((sock) => {
      sock.on('data', (chunk) => received.push(chunk))
    })
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    const { port } = server.address()

    const payload = 'HELLO ESC/POS'
    const result = await send('127.0.0.1', port, Buffer.from(payload).toString('base64'))

    expect(result.ok).toBe(true)
    await new Promise((r) => server.close(r))
    expect(Buffer.concat(received).toString()).toBe(payload)
  })

  it('returns ok:false when connection refused', async () => {
    // 127.0.0.1:1 deve recusar (porta privilegiada não bindada)
    const result = await send('127.0.0.1', 1, Buffer.from('X').toString('base64'))
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('returns ok:false on timeout to non-routable IP', async () => {
    // 240.0.0.0/4 é reservado e não roteável — força timeout
    const result = await send('240.0.0.1', 9100, Buffer.from('X').toString('base64'), 500)
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
  }, 10000)
})

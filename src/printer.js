import net from 'node:net'

/**
 * Envia bytes (base64) pra IP:porta via TCP raw (porta 9100 ESC/POS).
 * Retorna { ok: true } em sucesso, { ok: false, error: '...' } em falha.
 */
export function send(ip, port, payloadBase64, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const bytes = Buffer.from(payloadBase64, 'base64')
    const socket = new net.Socket()
    let done = false
    const finish = (result) => {
      if (done) return
      done = true
      socket.destroy()
      resolve(result)
    }

    socket.setTimeout(timeoutMs)
    socket.once('error',   (err) => finish({ ok: false, error: err.message }))
    socket.once('timeout', ()    => finish({ ok: false, error: `timeout after ${timeoutMs}ms` }))
    socket.connect(port, ip, () => {
      socket.write(bytes, (err) => {
        if (err) finish({ ok: false, error: err.message })
        else socket.end(() => finish({ ok: true }))
      })
    })
  })
}

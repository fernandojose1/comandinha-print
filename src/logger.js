import { appendFileSync, existsSync, statSync, renameSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const MAX_BYTES = 5 * 1024 * 1024 // 5MB

export function createLogger(path) {
  try { mkdirSync(dirname(path), { recursive: true }) } catch {}

  const write = (level, msg, extra) => {
    const line = `[${new Date().toISOString()}] ${level} ${msg}` +
                 (extra ? ' ' + JSON.stringify(extra) : '') + '\n'

    // Console: só warns e errors aparecem por padrão (info vai pra arquivo apenas)
    if (level !== 'INFO') {
      console.log(line.trimEnd())
    }

    try {
      if (existsSync(path) && statSync(path).size > MAX_BYTES) {
        renameSync(path, path + '.1')
      }
      appendFileSync(path, line)
    } catch {
      /* falha de IO no log é não-fatal */
    }
  }

  return {
    info:  (msg, extra) => write('INFO',  msg, extra),
    warn:  (msg, extra) => write('WARN',  msg, extra),
    error: (msg, extra) => write('ERROR', msg, extra),
  }
}

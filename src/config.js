import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs'
import { dirname } from 'node:path'

const DEFAULTS = {
  bearer: null,
  api_url: process.env.COMANDINHA_API_URL || 'https://api.comandinha.app.br',
}

export function loadConfig(path) {
  if (!existsSync(path)) return { ...DEFAULTS }
  try {
    return { ...DEFAULTS, ...JSON.parse(readFileSync(path, 'utf-8')) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveConfig(path, config) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(config, null, 2), 'utf-8')
  try { chmodSync(path, 0o600) } catch { /* Windows ignora */ }
}

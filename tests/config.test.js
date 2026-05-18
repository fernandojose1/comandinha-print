import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadConfig, saveConfig } from '../src/config.js'
import { tmpdir } from 'node:os'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'

let tmpDir
beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'cmp-')) })
afterEach(()  => { rmSync(tmpDir, { recursive: true, force: true }) })

describe('config', () => {
  it('returns defaults when file missing', () => {
    const cfg = loadConfig(join(tmpDir, 'config.json'))
    expect(cfg.bearer).toBeNull()
    expect(cfg.api_url).toMatch(/^https?:\/\//)
  })

  it('roundtrips save and load', () => {
    const path = join(tmpDir, 'config.json')
    saveConfig(path, { bearer: 'abc123', api_url: 'https://api.example.com' })
    expect(loadConfig(path)).toEqual({ bearer: 'abc123', api_url: 'https://api.example.com' })
  })

  it('returns defaults when file is corrupt JSON', () => {
    const path = join(tmpDir, 'config.json')
    saveConfig(path, { bearer: 'x', api_url: 'https://api.example.com' })
    // sobrescrever com lixo
    const { writeFileSync } = require('node:fs')
    writeFileSync(path, 'not-json{', 'utf-8')
    const cfg = loadConfig(path)
    expect(cfg.bearer).toBeNull()
  })
})

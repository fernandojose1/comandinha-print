import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('axios', () => {
  const post = vi.fn()
  const get  = vi.fn()
  const create = () => ({ post, get })
  return { default: { create, __mock: { post, get } } }
})

import { createApi, AGENT_VERSION } from '../src/api.js'
import axios from 'axios'

beforeEach(() => {
  axios.__mock.post.mockReset()
  axios.__mock.get.mockReset()
})

describe('api', () => {
  it('connect posts pair_token and returns bearer payload', async () => {
    axios.__mock.post.mockResolvedValueOnce({ data: { bearer: 'xxx', agent_id: 1, nome: 'PC' } })
    const api = createApi({ api_url: 'https://api.example' })
    const r = await api.connect('cmp-AAAA-BBBB-CCCC-DDDD')
    expect(axios.__mock.post).toHaveBeenCalledWith('/agent/connect', { pair_token: 'cmp-AAAA-BBBB-CCCC-DDDD' })
    expect(r.bearer).toBe('xxx')
    expect(r.agent_id).toBe(1)
  })

  it('getJobs sends Bearer header', async () => {
    axios.__mock.get.mockResolvedValueOnce({ data: [] })
    const api = createApi({ api_url: 'https://api.example', bearer: 'xxx' })
    await api.getJobs()
    expect(axios.__mock.get).toHaveBeenCalledWith('/agent/jobs', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer xxx' }),
    }))
  })

  it('ack posts to correct path with bearer', async () => {
    axios.__mock.post.mockResolvedValueOnce({ data: { ok: true } })
    const api = createApi({ api_url: 'https://api.example', bearer: 'xxx' })
    await api.ack(42, { success: true })
    expect(axios.__mock.post).toHaveBeenCalledWith(
      '/agent/jobs/42/ack',
      { success: true },
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer xxx' }) })
    )
  })

  it('heartbeat sends agent_version', async () => {
    axios.__mock.post.mockResolvedValueOnce({ data: { ok: true } })
    const api = createApi({ api_url: 'https://api.example', bearer: 'xxx' })
    await api.heartbeat()
    expect(axios.__mock.post).toHaveBeenCalledWith(
      '/agent/heartbeat',
      { agent_version: AGENT_VERSION },
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer xxx' }) })
    )
  })
})

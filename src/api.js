import axios from 'axios'

export const AGENT_VERSION = '0.1.0'

export function createApi({ api_url, bearer }) {
  const client = axios.create({
    baseURL: `${api_url}/api`,
    timeout: 10000,
  })

  const authHeader = () => bearer ? { Authorization: `Bearer ${bearer}` } : {}

  return {
    async connect(pair_token) {
      const r = await client.post('/agent/connect', { pair_token })
      return r.data
    },

    async getJobs() {
      const r = await client.get('/agent/jobs', { headers: authHeader() })
      return r.data
    },

    async ack(jobId, body) {
      const r = await client.post(`/agent/jobs/${jobId}/ack`, body, { headers: authHeader() })
      return r.data
    },

    async heartbeat() {
      const r = await client.post('/agent/heartbeat', { agent_version: AGENT_VERSION }, { headers: authHeader() })
      return r.data
    },
  }
}

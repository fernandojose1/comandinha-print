#!/usr/bin/env node
import { homedir } from 'node:os'
import { join } from 'node:path'
import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { loadConfig, saveConfig } from './src/config.js'
import { createApi, AGENT_VERSION } from './src/api.js'
import { send as printerSend } from './src/printer.js'
import { promptPairCode } from './src/pair.js'
import { createLogger } from './src/logger.js'
import { installAutoStart, isAutoStartInstalled } from './src/installer.js'

const CONFIG_DIR  = join(homedir(), '.comandinha-print')
const CONFIG_PATH = join(CONFIG_DIR, 'config.json')
const LOG_PATH    = join(CONFIG_DIR, 'agent.log')
// 5s reduz a carga no backend pela metade vs polling de 2s — latência
// aceitável pra cozinha (pedido sai em até ~5s do envio do garçom).
const POLL_MS     = 5000

const log = createLogger(LOG_PATH)
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function pair(config) {
  const token  = await promptPairCode()
  const api    = createApi({ api_url: config.api_url })

  try {
    const result = await api.connect(token)
    config.bearer = result.bearer
    saveConfig(CONFIG_PATH, config)
    console.log('')
    console.log(`✓ Conectado como "${result.nome}"!`)
    console.log('')
    log.info('paired', { agent_id: result.agent_id })

    await offerAutoStart()

    return config
  } catch (err) {
    const detail = err.response?.data?.message ?? err.message
    console.error(`✗ Falha no pareamento: ${detail}`)
    console.error('   Verifique o código no painel ou gere outro.')
    log.error('pair_failed', { detail })
    process.exit(1)
  }
}

async function offerAutoStart() {
  if (isAutoStartInstalled()) {
    console.log('ℹ Auto-start já está configurado neste PC. Vai subir sozinho no próximo boot.')
    console.log('')
    return
  }

  if (!stdin.isTTY) {
    console.log('ℹ Pra ativar o auto-start automaticamente, rode uma vez interativamente.')
    console.log('  (Ou rode `comandinha-print --install` quando quiser.)')
    console.log('')
    return
  }

  const rl = readline.createInterface({ input: stdin, output: stdout })
  console.log('Quer que o Comandinha Print abra sozinho sempre que o PC ligar?')
  console.log('(Recomendado — é o que mantém a impressão funcionando 24/7)')
  const ans = (await rl.question('[S/n] ')).trim().toLowerCase()
  rl.close()

  if (ans === 'n' || ans === 'nao' || ans === 'não' || ans === 'no') {
    console.log('Ok, fica só rodando enquanto você mantém a janela aberta.')
    console.log('Pra ativar depois: `comandinha-print --install`')
    console.log('')
    return
  }

  const result = installAutoStart(process.execPath)
  if (result.ok) {
    console.log(`✓ ${result.message}`)
    console.log('')
    console.log('  Por enquanto este programa continua rodando aqui no terminal —')
    console.log('  enquanto não fechar, ele fica recebendo os pedidos.')
    console.log('  Quando fechar, o serviço de auto-start assume.')
    log.info('autostart_installed', { path: result.path })
  } else {
    console.warn(`⚠ Não consegui configurar o auto-start: ${result.message}`)
    console.warn('  Você pode continuar abrindo o programa manualmente. Tudo o resto funciona normal.')
    log.warn('autostart_failed', result)
  }
  console.log('')
}

async function main() {
  console.log(`Comandinha Print v${AGENT_VERSION}`)

  // Flag --install reinstala o auto-start manualmente (útil pós-update do binário)
  if (process.argv.includes('--install')) {
    const result = installAutoStart(process.execPath)
    if (result.ok) {
      console.log(`✓ ${result.message}`)
      process.exit(0)
    }
    console.error(`✗ ${result.message}`)
    process.exit(1)
  }

  let config = loadConfig(CONFIG_PATH)
  console.log(`API: ${config.api_url}`)

  if (!config.bearer) {
    config = await pair(config)
  }

  let api = createApi(config)
  console.log('Aguardando jobs… (Ctrl+C pra sair)')
  console.log('')

  while (true) {
    try {
      const jobs = await api.getJobs()

      for (const job of jobs) {
        log.info('job_pickup', { id: job.id, ip: job.ip, porta: job.porta })
        const result = await printerSend(job.ip, job.porta, job.payload_base64)

        await api.ack(job.id, result.ok
          ? { success: true, agent_version: AGENT_VERSION }
          : { success: false, error_message: result.error, agent_version: AGENT_VERSION })

        if (result.ok) {
          console.log(`✓ job ${job.id} impresso (${job.ip}:${job.porta})`)
        } else {
          console.warn(`✗ job ${job.id} falhou: ${result.error}`)
        }
        log.info('job_done', { id: job.id, ok: result.ok, error: result.error })
      }

      if (jobs.length === 0) {
        await api.heartbeat()
      }
    } catch (err) {
      const status = err.response?.status

      if (status === 401) {
        console.warn('')
        console.warn('⚠ Sessão expirada. Vamos parear de novo.')
        console.warn('')
        log.warn('bearer_revoked')
        config.bearer = null
        saveConfig(CONFIG_PATH, config)
        config = await pair(config)
        api = createApi(config)
        continue
      }

      log.warn('poll_error', { msg: err.message, status })
    }

    await sleep(POLL_MS)
  }
}

main().catch((err) => {
  log.error('fatal', { msg: err.message, stack: err.stack })
  console.error('')
  console.error(`Erro fatal: ${err.message}`)
  process.exit(1)
})

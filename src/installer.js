import { writeFileSync, mkdirSync, existsSync, chmodSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { homedir, platform } from 'node:os'
import { join } from 'node:path'

/**
 * Instala o agente como auto-start no OS atual.
 *
 * Linux:  cria ~/.config/systemd/user/comandinha-print.service + enable + loginctl enable-linger
 * macOS:  cria ~/Library/LaunchAgents/com.comandinha.print.plist + launchctl load
 * Windows: cria atalho .bat em %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\
 *
 * Retorna { ok, message, path? } pra ser exibido pro usuário.
 */
export function installAutoStart(execPath) {
  const os = platform()

  try {
    if (os === 'linux') return installLinux(execPath)
    if (os === 'darwin') return installMacOS(execPath)
    if (os === 'win32') return installWindows(execPath)
    return { ok: false, message: `Sistema operacional não suportado: ${os}` }
  } catch (err) {
    return { ok: false, message: err.message }
  }
}

function installLinux(execPath) {
  const dir = join(homedir(), '.config', 'systemd', 'user')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, 'comandinha-print.service')

  const content = `[Unit]
Description=Comandinha Print Agent
After=network-online.target

[Service]
ExecStart=${execPath}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
`
  writeFileSync(path, content)

  try { execSync('systemctl --user daemon-reload', { stdio: 'pipe' }) } catch {}
  try { execSync('systemctl --user enable comandinha-print.service', { stdio: 'pipe' }) } catch (e) {
    return { ok: false, message: `systemctl enable falhou: ${e.message}`, path }
  }

  // loginctl enable-linger mantém o serviço user rodando mesmo sem login gráfico.
  // Falha silenciosa em ambientes sem polkit (containers, etc).
  try {
    execSync(`loginctl enable-linger ${process.env.USER || ''}`, { stdio: 'pipe' })
  } catch {}

  return {
    ok: true,
    path,
    message: 'Auto-start configurado via systemd. O agente vai subir no boot. Logs: journalctl --user -u comandinha-print -f',
  }
}

function installMacOS(execPath) {
  const dir = join(homedir(), 'Library', 'LaunchAgents')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, 'com.comandinha.print.plist')

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.comandinha.print</string>
  <key>ProgramArguments</key>
  <array>
    <string>${execPath}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${join(homedir(), '.comandinha-print', 'launchd.out.log')}</string>
  <key>StandardErrorPath</key>
  <string>${join(homedir(), '.comandinha-print', 'launchd.err.log')}</string>
</dict>
</plist>
`
  writeFileSync(path, content)
  chmodSync(path, 0o644)

  try { execSync(`launchctl unload "${path}"`, { stdio: 'pipe' }) } catch {}
  try {
    execSync(`launchctl load "${path}"`, { stdio: 'pipe' })
  } catch (e) {
    return { ok: false, message: `launchctl load falhou: ${e.message}`, path }
  }

  return {
    ok: true,
    path,
    message: 'Auto-start configurado via launchd. O agente vai subir no login do macOS.',
  }
}

function installWindows(execPath) {
  const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
  const dir = join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
  mkdirSync(dir, { recursive: true })

  // Cria .bat ao invés de atalho (.lnk requer COM/PowerShell, mais frágil).
  // O .bat usa "start" pra não bloquear o login enquanto roda em background.
  const path = join(dir, 'comandinha-print.bat')
  const content = `@echo off\r\nstart "" /B "${execPath}"\r\n`
  writeFileSync(path, content)

  return {
    ok: true,
    path,
    message: 'Auto-start configurado na pasta Startup do Windows. O agente vai subir no próximo login.',
  }
}

/**
 * Verifica se já existe configuração de auto-start instalada.
 */
export function isAutoStartInstalled() {
  const os = platform()

  if (os === 'linux') {
    return existsSync(join(homedir(), '.config', 'systemd', 'user', 'comandinha-print.service'))
  }
  if (os === 'darwin') {
    return existsSync(join(homedir(), 'Library', 'LaunchAgents', 'com.comandinha.print.plist'))
  }
  if (os === 'win32') {
    const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
    return existsSync(join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'comandinha-print.bat'))
  }
  return false
}

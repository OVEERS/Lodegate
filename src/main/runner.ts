import { app, ipcMain, BrowserWindow } from 'electron'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { loadServers } from './servers'
import type { ServerStatus } from './types'

interface Running {
  proc: ChildProcessWithoutNullStreams
  status: ServerStatus
  log: string[]
}

const running = new Map<string, Running>()
const MAX_LOG_LINES = 1000

function sendAll(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

function setStatus(id: string, status: ServerStatus): void {
  const r = running.get(id)
  if (r) r.status = status
  sendAll('server:status', { id, status })
}

function pushLog(id: string, text: string): void {
  const r = running.get(id)
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
  for (const line of lines) {

    if (r) {
      r.log.push(line)
      if (r.log.length > MAX_LOG_LINES) r.log.shift()
    }
    sendAll('server:log', { id, line })
  }
}

function isEulaAccepted(dir: string): boolean {
  const file = join(dir, 'eula.txt')
  if (!existsSync(file)) return false
  return /^\s*eula\s*=\s*true\s*$/im.test(readFileSync(file, 'utf-8'))
}

function writeEula(dir: string): void {
  const text =
    '# By changing the setting below to TRUE you are indicating your agreement to the Minecraft EULA (https://aka.ms/MinecraftEULA).\n' +
    'eula=true\n'
  writeFileSync(join(dir, 'eula.txt'), text, 'utf-8')
}

export function startServer(id: string): void {
  if (running.has(id)) throw new Error('Сервер уже запущен')

  const server = loadServers().find((s) => s.id === id)
  if (!server) throw new Error('Сервер не найден')
  if (!server.installed || !server.javaPath) throw new Error('Сервер не установлен')
  if (!isEulaAccepted(server.dir)) throw new Error('EULA_NOT_ACCEPTED')

  const args = [
    `-Xms${server.minRamMb}M`,
    `-Xmx${server.maxRamMb}M`,

    '-Dfile.encoding=UTF-8',
    '-jar',
    'server.jar',
    'nogui'
  ]

  const proc = spawn(server.javaPath, args, { cwd: server.dir })
  running.set(id, { proc, status: 'starting', log: [] })
  setStatus(id, 'starting')

  const onData = (data: Buffer): void => {
    const text = data.toString('utf-8')
    pushLog(id, text)
    if (/\bDone \(/.test(text)) setStatus(id, 'running')
  }
  proc.stdout.on('data', onData)
  proc.stderr.on('data', onData)

  proc.on('error', (err) => {
    pushLog(id, `[Lodegate] Не удалось запустить процесс: ${err.message}`)
  })

  proc.on('close', (code) => {
    pushLog(id, `[Lodegate] Процесс завершён, код ${code}`)
    running.delete(id)
    sendAll('server:status', { id, status: 'stopped' as ServerStatus })
  })
}

export function stopServer(id: string): void {
  const r = running.get(id)
  if (!r) return

  setStatus(id, 'stopping')
  r.proc.stdin.write('stop\n')

  // Если сервер завис, через 30 секунд завершаем принудительно
  setTimeout(() => {
    if (running.has(id)) {
      pushLog(id, '[Lodegate] Сервер не ответил на stop, завершаю принудительно')
      running.get(id)?.proc.kill()
    }
  }, 30000)
}

export function sendCommand(id: string, command: string): void {
  const r = running.get(id)
  if (!r) return
  r.proc.stdin.write(command + '\n')
}

// При закрытии приложения останавливаем серверы корректно
export function stopAllServers(): void {
  for (const id of running.keys()) stopServer(id)
}

export function registerRunnerIpc(): void {
  ipcMain.handle('server:start', (_e, id: string) => {
    try {
      startServer(id)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  })


  ipcMain.handle('server:stop', (_e, id: string) => {
    stopServer(id)
  })

  ipcMain.handle('server:command', (_e, id: string, command: string) => {
    sendCommand(id, command)
  })

  ipcMain.handle('server:state', (_e, id: string) => {
    const r = running.get(id)
    return { status: (r?.status ?? 'stopped') as ServerStatus, log: r?.log ?? [] }
  })

  ipcMain.handle('server:eulaStatus', (_e, id: string) => {
    const server = loadServers().find((s) => s.id === id)
    return server ? isEulaAccepted(server.dir) : false
  })

  ipcMain.handle('server:acceptEula', (_e, id: string) => {
    const server = loadServers().find((s) => s.id === id)
    if (!server) return false
    writeEula(server.dir)
    return true
  })

  app.on('before-quit', () => stopAllServers())
}
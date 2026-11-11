import { app, ipcMain, BrowserWindow } from 'electron'
import { spawn, execFile, ChildProcessWithoutNullStreams } from 'child_process'
import { cpus } from 'os'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { loadServers } from './servers'
import type { ServerStatus } from './types'

interface Stats {
  ramMb: number
  cpu: number
}

interface Running {
  proc: ChildProcessWithoutNullStreams
  status: ServerStatus
  log: string[]
  players: Set<string>
  stats: Stats
  timer?: NodeJS.Timeout
  lastCpu?: { sec: number; at: number }
  sampling: boolean
}

const running = new Map<string, Running>()
const MAX_LOG_LINES = 1000
const CORES = cpus().length

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

function sendPlayers(id: string): void {
  const r = running.get(id)
  sendAll('server:players', { id, players: r ? [...r.players] : [] })
}

function pushLog(id: string, text: string): void {
  const r = running.get(id)
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
  for (const line of lines) {
    if (r) {
      r.log.push(line)
      if (r.log.length > MAX_LOG_LINES) r.log.shift()

      const joined = line.match(/: (\S+) joined the game/)
      const left = line.match(/: (\S+) left the game/)
      if (joined) {
        r.players.add(joined[1])
        sendPlayers(id)
      } else if (left) {
        r.players.delete(left[1])
        sendPlayers(id)
      }
    }
    sendAll('server:log', { id, line })

  }
}

function readMaxPlayers(dir: string): number {
  try {
    const file = join(dir, 'server.properties')
    if (existsSync(file)) {
      const m = readFileSync(file, 'utf-8').match(/^max-players\s*=\s*(\d+)/m)
      if (m) return Number(m[1])
    }
  } catch {
  }
  return 20
}

function sampleStats(id: string): void {
  const r = running.get(id)
  if (!r || r.sampling || !r.proc.pid) return
  r.sampling = true

  const cmd = `Get-Process -Id ${r.proc.pid} | Select-Object CPU,WorkingSet64 | ConvertTo-Json -Compress`
  execFile(
    'powershell',
    ['-NoProfile', '-NonInteractive', '-Command', cmd],
    { windowsHide: true },
    (err, stdout) => {
      const cur = running.get(id)
      if (!cur) return
      cur.sampling = false
      if (err) return

      try {
        const data = JSON.parse(stdout) as { CPU: number | null; WorkingSet64: number }
        const now = Date.now()
        let cpu = cur.stats.cpu
        if (cur.lastCpu && data.CPU !== null) {
          const dSec = data.CPU - cur.lastCpu.sec
          const dWall = (now - cur.lastCpu.at) / 1000
          if (dWall > 0) cpu = Math.max(0, Math.min(100, (dSec / dWall / CORES) * 100))
        }
        if (data.CPU !== null) cur.lastCpu = { sec: data.CPU, at: now }
        cur.stats = { ramMb: data.WorkingSet64 / 1024 / 1024, cpu }
        sendAll('server:stats', { id, ...cur.stats })
      } catch {
      }
    }
  )
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
  const entry: Running = {
    proc,
    status: 'starting',
    log: [],
    players: new Set(),
    stats: { ramMb: 0, cpu: 0 },
    sampling: false
  }
  running.set(id, entry)
  setStatus(id, 'starting')

  entry.timer = setInterval(() => sampleStats(id), 3000)

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
    const r = running.get(id)
    if (r?.timer) clearInterval(r.timer)
    running.delete(id)
    sendAll('server:players', { id, players: [] })
    sendAll('server:stats', { id, ramMb: 0, cpu: 0 })
    sendAll('server:status', { id, status: 'stopped' as ServerStatus })
  })
}

export function stopServer(id: string): void {
  const r = running.get(id)
  if (!r) return
  setStatus(id, 'stopping')
  r.proc.stdin.write('stop\n')

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
    const server = loadServers().find((s) => s.id === id)
    return {
      status: (r?.status ?? 'stopped') as ServerStatus,
      log: r?.log ?? [],
      players: r ? [...r.players] : [],
      stats: r?.stats ?? { ramMb: 0, cpu: 0 },
      maxPlayers: server ? readMaxPlayers(server.dir) : 20
    }
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
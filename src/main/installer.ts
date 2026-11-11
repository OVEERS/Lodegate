import { ipcMain, BrowserWindow } from 'electron'
import { join } from 'path'
import { createWriteStream, existsSync, mkdirSync, renameSync, unlinkSync } from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { getJarInfo, getJavaMajor } from './versions'
import { loadServers, updateServer } from './servers'
import { ensureJava } from './java'
import type { InstallProgress } from './types'

const USER_AGENT = 'Lodegate/0.0.1 (https://github.com/OVEERS/Lodegate)'

function send(progress: InstallProgress): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('install:progress', progress)
  }
}

async function downloadFile(
  url: string,
  target: string,
  onProgress: (received: number, total: number) => void
): Promise<void> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

  const total = Number(res.headers.get('content-length') ?? 0)
  let received = 0
  const part = target + '.part'

  const source = Readable.fromWeb(res.body as never)
  source.on('data', (chunk: Buffer) => {

    received += chunk.length
    onProgress(received, total)
  })

  try {
    await pipeline(source, createWriteStream(part))
    renameSync(part, target)
  } catch (e) {
    if (existsSync(part)) unlinkSync(part)
    throw e
  }
}

export async function installServer(id: string): Promise<void> {
  const server = loadServers().find((s) => s.id === id)
  if (!server) throw new Error('Сервер не найден')

  try {
    send({ id, stage: 'preparing', received: 0, total: 0 })
    mkdirSync(server.dir, { recursive: true })

    // 1. Ядро
    const jar = await getJarInfo(server.core, server.mcVersion)
    const target = join(server.dir, 'server.jar')

    let lastSent = 0
    await downloadFile(jar.url, target, (received, total) => {
      const now = Date.now()
      if (now - lastSent < 100) return
      lastSent = now
      send({ id, stage: 'downloading', received, total })
    })


    // 2. Java нужной версии
    send({ id, stage: 'java', received: 0, total: 0 })
    const major = await getJavaMajor(server.mcVersion)
    const javaPath = await ensureJava(major)

    updateServer(id, { installed: true, javaMajor: major, javaPath })
    send({ id, stage: 'done', received: 1, total: 1 })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    send({ id, stage: 'error', received: 0, total: 0, message })
    throw e
  }
}

export function registerInstallerIpc(): void {
  ipcMain.handle('install:start', async (_e, id: string) => {
    try {
      await installServer(id)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  })
}
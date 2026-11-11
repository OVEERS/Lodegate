import { app, ipcMain, BrowserWindow } from 'electron'
import { join } from 'path'
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  unlinkSync
} from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import extract from 'extract-zip'

const USER_AGENT = 'Lodegate/0.0.1 (https://github.com/OVEERS/Lodegate)'

export interface JavaProgress {
  major: number
  stage: 'downloading' | 'extracting' | 'done' | 'error'
  received: number
  total: number
  message?: string
}

function send(p: JavaProgress): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('java:progress', p)
  }
}

function javaRoot(major: number): string {

  return join(app.getPath('userData'), 'java', String(major))
}

// Ищем java.exe внутри папки
function findJavaExe(root: string): string | null {
  if (!existsSync(root)) return null
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const candidate = join(root, entry.name, 'bin', 'java.exe')
    if (existsSync(candidate)) return candidate
  }
  return null
}

export function getInstalledJava(major: number): string | null {
  return findJavaExe(javaRoot(major))
}

async function download(
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

// Возвращает путь к java.exe
export async function ensureJava(major: number): Promise<string> {
  const existing = getInstalledJava(major)
  if (existing) return existing

  try {
    const root = javaRoot(major)
    mkdirSync(root, { recursive: true })

    // Adoptium перенаправляет на актуальную сборку
    const url =
      `https://api.adoptium.net/v3/binary/latest/${major}/ga/windows/x64/jdk/hotspot/normal/eclipse`
    const zipPath = join(root, 'jdk.zip')

    let lastSent = 0
    await download(url, zipPath, (received, total) => {
      const now = Date.now()
      if (now - lastSent < 100) return
      lastSent = now

      send({ major, stage: 'downloading', received, total })
    })

    send({ major, stage: 'extracting', received: 0, total: 0 })
    await extract(zipPath, { dir: root })
    unlinkSync(zipPath)

    const exe = findJavaExe(root)
    if (!exe) throw new Error('После распаковки не найден java.exe')

    send({ major, stage: 'done', received: 1, total: 1 })
    return exe
  } catch (e) {
    rmSync(javaRoot(major), { recursive: true, force: true })
    const message = e instanceof Error ? e.message : String(e)
    send({ major, stage: 'error', received: 0, total: 0, message })
    throw e
  }
}

export function registerJavaIpc(): void {
  ipcMain.handle('java:ensure', async (_e, major: number) => {
    try {
      const path = await ensureJava(major)
      return { ok: true, path }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  })
  ipcMain.handle('java:status', (_e, major: number) => getInstalledJava(major))
}
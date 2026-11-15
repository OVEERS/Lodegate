import { ipcMain, shell } from 'electron'
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'path'
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  realpathSync,
  statSync,
  writeFileSync
} from 'fs'
import { loadServers } from './servers'
import { isServerActive } from './runner'

const MAX_READ_BYTES = 2 * 1024 * 1024
const MAX_FORCE_BYTES = 512 * 1024
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

const BINARY_EXT = new Set([
  '.jar', '.mca', '.mcr', '.dat', '.dat_old', '.nbt', '.zip', '.gz', '.exe', '.dll', '.so',
  '.ogg', '.class', '.bin', '.db', '.sqlite', '.lock'
])

const IMAGE_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp'
}

const msg = (e: unknown): string => (e instanceof Error ? e.message : String(e))

function isInside(root: string, target: string): boolean {
  const rel = relative(root, target)
  return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep))
}

// Главная защита: итоговый путь обязан лежать внутри папки сервера
function resolveSafe(id: string, rel: string): { root: string; target: string } {
  const server = loadServers().find((s) => s.id === id)
  if (!server) throw new Error('Сервер не найден')

  const root = resolve(server.dir)
  if (!existsSync(root)) throw new Error('Папка сервера не найдена')

  const target = resolve(root, rel)
  if (!isInside(root, target)) throw new Error('Путь вне папки сервера')

  const probe = existsSync(target) ? target : dirname(target)
  if (existsSync(probe) && !isInside(realpathSync(root), realpathSync(probe))) {
    throw new Error('Путь вне папки сервера')
  }
  return { root, target }
}

export function registerFilesIpc(): void {
  ipcMain.handle('files:list', (_e, id: string, rel: string) => {
    try {
      const { target } = resolveSafe(id, rel)
      const entries = readdirSync(target, { withFileTypes: true }).map((d) => {
        let size = 0
        if (d.isFile()) {
          try {
            size = statSync(join(target, d.name)).size
          } catch {
            /* файл мог исчезнуть */
          }
        }
        return { name: d.name, isDir: d.isDirectory(), size }
      })
      entries.sort((a, b) =>
        a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1
      )
      return { ok: true, entries }
    } catch (e) {
      return { ok: false, error: msg(e), entries: [] }
    }
  })

  // mode: 'normal' (редактирование), 'force' (только чтение, любой файл)
  ipcMain.handle(
    'files:read',
    (_e, id: string, rel: string, mode: 'normal' | 'force' = 'normal') => {
      try {
        const { target } = resolveSafe(id, rel)
        const st = statSync(target)
        if (!st.isFile()) return { ok: false, error: 'notFile' }
        const ext = extname(target).toLowerCase()

        // Картинки отдаём как data URL для превью
        if (IMAGE_MIME[ext]) {
          if (st.size > MAX_IMAGE_BYTES) return { ok: false, error: 'tooLarge' }
          const data = readFileSync(target).toString('base64')
          return { ok: true, kind: 'image', dataUrl: `data:${IMAGE_MIME[ext]};base64,${data}` }
        }

        if (mode === 'force') {
          const len = Math.min(st.size, MAX_FORCE_BYTES)
          const buf = Buffer.alloc(len)
          const fd = openSync(target, 'r')
          try {
            readSync(fd, buf, 0, len, 0)
          } finally {
            closeSync(fd)
          }
          return {
            ok: true,
            kind: 'forced',
            content: buf.toString('utf-8'),
            truncated: st.size > MAX_FORCE_BYTES
          }
        }

        if (BINARY_EXT.has(ext)) return { ok: false, error: 'binary' }
        if (st.size > MAX_READ_BYTES) return { ok: false, error: 'tooLarge' }
        const buf = readFileSync(target)
        if (buf.includes(0)) return { ok: false, error: 'binary' }
        return { ok: true, kind: 'text', content: buf.toString('utf-8') }
      } catch (e) {
        return { ok: false, error: msg(e) }
      }
    }
  )

  ipcMain.handle('files:write', (_e, id: string, rel: string, content: string) => {
    try {
      const { root, target } = resolveSafe(id, rel)
      if (isServerActive(id) && relative(root, target).toLowerCase() === 'server.properties') {
        return { ok: false, error: 'active' }
      }
      if (existsSync(target) && !statSync(target).isFile()) {
        return { ok: false, error: 'notFile' }
      }
      writeFileSync(target, content, 'utf-8')
      return { ok: true }
    } catch (e) {
      return { ok: false, error: msg(e) }
    }
  })

  ipcMain.handle('files:create', (_e, id: string, rel: string, isDir: boolean) => {
    try {
      const { target } = resolveSafe(id, rel)
      const name = basename(target)
      if (!name.trim() || /[<>:"|?*]/.test(name) || name.endsWith('.')) {
        return { ok: false, error: 'invalidName' }
      }
      if (existsSync(target)) return { ok: false, error: 'exists' }
      if (isDir) mkdirSync(target)
      else writeFileSync(target, '', 'utf-8')
      return { ok: true }
    } catch (e) {
      return { ok: false, error: msg(e) }
    }
  })

  ipcMain.handle('files:remove', async (_e, id: string, rel: string) => {
    try {
      const { root, target } = resolveSafe(id, rel)
      if (target === root) return { ok: false, error: 'Нельзя удалить корень сервера' }
      if (isServerActive(id)) return { ok: false, error: 'active' }
      await shell.trashItem(target)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: msg(e) }
    }
  })
}
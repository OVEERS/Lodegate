import { ipcMain } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { loadServers } from './servers'
import { isServerActive } from './runner'

function propsPath(id: string): string | null {
  const server = loadServers().find((s) => s.id === id)
  return server ? join(server.dir, 'server.properties') : null
}

// В файле значения могут быть записаны как \u00A7 или minecraft\:normal
function unescapeValue(v: string): string {
  return v.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (_m, g: string) =>
    g.length === 5 ? String.fromCharCode(parseInt(g.slice(1), 16)) : g
  )
}

// Все не-ASCII символы пишем как \uXXXX, так их безопасно читает Java
function escapeValue(v: string): string {
  const clean = v.replace(/[\r\n]+/g, ' ')
  let out = ''
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i)
    if (clean[i] === '\\') out += '\\\\'
    else if (code > 126) out += '\\u' + code.toString(16).padStart(4, '0')
    else out += clean[i]
  }
  return out
}

function parse(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('!')) continue
    const i = raw.indexOf('=')
    if (i < 0) continue
    result[raw.slice(0, i).trim()] = unescapeValue(raw.slice(i + 1))
  }
  return result
}

// Меняем только нужные строки, комментарии и порядок сохраняются
function applyPatch(text: string, patch: Record<string, string>): string {
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const done = new Set<string>()
  const has = (key: string): boolean => Object.prototype.hasOwnProperty.call(patch, key)

  const lines = text.split(/\r?\n/).map((raw) => {
    const trimmed = raw.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) return raw
    const i = raw.indexOf('=')
    if (i < 0) return raw
    const key = raw.slice(0, i).trim()
    if (!has(key)) return raw
    done.add(key)
    return `${key}=${escapeValue(patch[key])}`
  })

  while (lines.length && lines[lines.length - 1] === '') lines.pop()
  for (const key of Object.keys(patch)) {
    if (!done.has(key)) lines.push(`${key}=${escapeValue(patch[key])}`)
  }
  return lines.join(eol) + eol
}

export function registerPropertiesIpc(): void {
  ipcMain.handle('props:exists', (_e, id: string) => {
    const file = propsPath(id)
    return !!file && existsSync(file)
  })

  ipcMain.handle('props:read', (_e, id: string) => {
    const file = propsPath(id)
    if (!file || !existsSync(file)) return { exists: false, values: {} }
    return { exists: true, values: parse(readFileSync(file, 'utf-8')) }
  })

  ipcMain.handle('props:write', (_e, id: string, patch: Record<string, string>) => {
    const file = propsPath(id)
    if (!file || !existsSync(file) || isServerActive(id)) return false
    writeFileSync(file, applyPatch(readFileSync(file, 'utf-8'), patch), 'utf-8')
    return true
  })
}
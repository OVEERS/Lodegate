import { app, ipcMain } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

export interface AppSettings {
  language: 'ru' | 'en'
  minimizeToTray: boolean
  telemetry: boolean
}

const defaults: AppSettings = {
  language: 'ru',
  minimizeToTray: true,
  telemetry: false //телеметрия выключена по умолчанию
}

let cache: AppSettings | null = null

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export function loadSettings(): AppSettings {
  if (cache) return cache
  try {
    const file = settingsPath()
    if (existsSync(file)) {
      const raw = JSON.parse(readFileSync(file, 'utf-8'))
      cache = { ...defaults, ...raw }
      return cache!
    }
  } catch (e) {
    console.error('Не удалось прочитать settings.json, беру значения по умолчанию', e)
  }
  cache = { ...defaults }
  return cache
}

function saveSettings(settings: AppSettings): void {
  const file = settingsPath()
  mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(file, JSON.stringify(settings, null, 2), 'utf-8')
  cache = settings
}

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', () => loadSettings())

  ipcMain.handle('settings:set', (_event, patch: Partial<AppSettings>) => {
    const next = { ...loadSettings(), ...patch }
    saveSettings(next)
    return next
  })
}
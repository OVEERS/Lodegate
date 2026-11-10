import { app, ipcMain, dialog, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { randomUUID } from 'crypto'
import type { ServerConfig } from './types'

function serversPath(): string {
  return join(app.getPath('userData'), 'servers.json')
}

export function loadServers(): ServerConfig[] {
  try {
    const file = serversPath()
    if (existsSync(file)) {
      return JSON.parse(readFileSync(file, 'utf-8'))
    }
  } catch (e) {
    console.error('Не удалось прочитать servers.json', e)
  }
  return []
}

function saveServers(list: ServerConfig[]): void {
  mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(serversPath(), JSON.stringify(list, null, 2), 'utf-8')
}

export function registerServersIpc(): void {
  ipcMain.handle('servers:list', () => loadServers())

  ipcMain.handle('servers:add', (_event, data: Omit<ServerConfig, 'id' | 'createdAt'>) => {
    const list = loadServers()

    const server: ServerConfig = { ...data, id: randomUUID(), createdAt: Date.now() }
    list.push(server)
    saveServers(list)
    return server
  })

  ipcMain.handle('servers:remove', (_event, id: string) => {
    const list = loadServers().filter((s) => s.id !== id)
    saveServers(list)
    return list
  })

  // Папка по умолчанию: Документы\Lodegate\servers
  ipcMain.handle('servers:defaultDir', () => {
    return join(app.getPath('documents'), 'Lodegate', 'servers')
  })

  // Окно выбора папки
  ipcMain.handle('servers:pickFolder', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const options = {
      properties: ['openDirectory', 'createDirectory'] as ('openDirectory' | 'createDirectory')[]
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    return result.canceled ? null : result.filePaths[0]
  })
}
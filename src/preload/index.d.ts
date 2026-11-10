import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface AppSettings {
    language: 'ru' | 'en'
    minimizeToTray: boolean
    telemetry: boolean
  }

  interface ServerConfig {
    id: string
    name: string
    core: 'paper' | 'vanilla'
    mcVersion: string
    dir: string
    minRamMb: number
    maxRamMb: number
    createdAt: number
  }

  interface Window {
    electron: ElectronAPI
    api: {
      settings: {
        get: () => Promise<AppSettings>
        set: (patch: Partial<AppSettings>) => Promise<AppSettings>
      }
      servers: {
        list: () => Promise<ServerConfig[]>
        add: (data: Omit<ServerConfig, 'id' | 'createdAt'>) => Promise<ServerConfig>
        remove: (id: string) => Promise<ServerConfig[]>
      }

      versions: {
        list: (core: 'paper' | 'vanilla') => Promise<string[]>
        jar: (
          core: 'paper' | 'vanilla',
          version: string
        ) => Promise<{ url: string; fileName: string; build?: number }>
        java: (version: string) => Promise<number>
      }
    }
  }
}
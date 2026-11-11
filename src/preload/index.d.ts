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
    installed: boolean
    javaMajor?: number
    javaPath?: string
  }

  interface InstallProgress {
    id: string
    stage: 'preparing' | 'downloading' | 'java' | 'done' | 'error'
    received: number
    total: number
    message?: string
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
        add: (
          data: Omit<ServerConfig, 'id' | 'createdAt' | 'installed'>
        ) => Promise<ServerConfig>
        remove: (id: string) => Promise<ServerConfig[]>
        defaultDir: () => Promise<string>
        pickFolder: () => Promise<string | null>
      }
      versions: {
        list: (core: 'paper' | 'vanilla') => Promise<string[]>
        jar: (
          core: 'paper' | 'vanilla',
          version: string
        ) => Promise<{ url: string; fileName: string; build?: number }>
        java: (version: string) => Promise<number>
      }
      install: {
        start: (id: string) => Promise<{ ok: boolean; error?: string }>
        onProgress: (callback: (p: InstallProgress) => void) => () => void
      }
    }
  }
}